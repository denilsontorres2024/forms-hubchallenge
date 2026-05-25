import express from "express";
import { Pool } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const fallbackPorts = process.env.NODE_ENV === "production" ? [80, 3000, 8080] : [];
const readEnv = (...names) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return "";
};

const normalizeSupabaseRestUrl = (url) => {
  if (!url) return "";
  const normalized = url.replace(/\/$/, "");
  return normalized.endsWith("/rest/v1") ? normalized : `${normalized}/rest/v1`;
};

const databaseUrl = readEnv("DATABASE_URL");
const supabaseRestUrl = normalizeSupabaseRestUrl(readEnv("SUPABASE_REST_URL", "SUPABASE_URL"));
const supabaseSecretKey = readEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY");
const supabaseSubmissionsTable = readEnv("SUPABASE_SUBMISSIONS_TABLE") || "submissions";
const supabaseGuestsTable = readEnv("SUPABASE_GUESTS_TABLE") || "guests";
const storageProvider = supabaseRestUrl && supabaseSecretKey ? "supabase" : databaseUrl ? "postgres" : "none";

if (storageProvider === "none") {
  console.warn("No database configured. Set Supabase variables or DATABASE_URL.");
}

console.log(
  `Storage provider: ${storageProvider}; Supabase URL: ${supabaseRestUrl ? "configured" : "missing"}; Supabase key: ${
    supabaseSecretKey ? "configured" : "missing"
  }; submissions table: ${supabaseSubmissionsTable}; guests table: ${supabaseGuestsTable}`,
);

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    })
  : null;

app.use(express.json({ limit: "1mb" }));

async function ensureDatabase() {
  if (storageProvider !== "postgres" || !pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      form_type TEXT NOT NULL,
      full_name TEXT,
      team_number TEXT,
      whatsapp TEXT,
      email TEXT,
      status TEXT,
      payload JSONB NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at
    ON submissions (submitted_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_submissions_form_type
    ON submissions (form_type);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      form_type TEXT NOT NULL,
      guest_type TEXT NOT NULL,
      position INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      cpf TEXT,
      whatsapp TEXT,
      payload JSONB NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_guests_submission_id
    ON guests (submission_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_guests_guest_type
    ON guests (guest_type);
  `);
}

function createId() {
  return `submission-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSubmission(body) {
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : body;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    const error = new Error("Payload inválido.");
    error.status = 400;
    throw error;
  }

  if (!payload.formType || typeof payload.formType !== "string") {
    const error = new Error("formType é obrigatório.");
    error.status = 400;
    throw error;
  }

  return {
    id: typeof body?.id === "string" ? body.id : createId(),
    submittedAt: typeof body?.submittedAt === "string" ? body.submittedAt : new Date().toISOString(),
    payload,
  };
}

function rowToSubmission(row) {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    synced: true,
    payload: row.payload,
  };
}

function submissionToDbRow(submission) {
  return {
    id: submission.id,
    submitted_at: submission.submittedAt,
    form_type: submission.payload.formType,
    full_name: submission.payload.fullName || null,
    team_number: submission.payload.teamNumber || null,
    whatsapp: submission.payload.whatsapp || null,
    email: submission.payload.email || null,
    status: submission.payload.status || null,
    payload: submission.payload,
  };
}

function sanitizeGuestName(guest) {
  return typeof guest?.fullName === "string" ? guest.fullName.trim() : "";
}

function guestToDbRow(submission, guest, guestType, position) {
  return {
    id: `${submission.id}-${guestType}-${position}`,
    submission_id: submission.id,
    form_type: submission.payload.formType,
    guest_type: guestType,
    position,
    full_name: sanitizeGuestName(guest),
    cpf: typeof guest?.cpf === "string" && guest.cpf.trim() ? guest.cpf.trim() : null,
    whatsapp: typeof guest?.whatsapp === "string" && guest.whatsapp.trim() ? guest.whatsapp.trim() : null,
    payload: guest,
  };
}

function extractGuests(submission) {
  const rows = [];
  const payload = submission.payload;

  if (payload.formType === "finalist_confirmation") {
    if (payload.guest && sanitizeGuestName(payload.guest)) {
      rows.push(guestToDbRow(submission, payload.guest, "guaranteed", 1));
    }

    if (Array.isArray(payload.extraGuests)) {
      payload.extraGuests.forEach((guest, index) => {
        if (sanitizeGuestName(guest)) {
          rows.push(guestToDbRow(submission, guest, "extra", index + 1));
        }
      });
    }
  }

  if (payload.formType === "interest_request" && Array.isArray(payload.guests)) {
    payload.guests.forEach((guest, index) => {
      if (sanitizeGuestName(guest)) {
        rows.push(guestToDbRow(submission, guest, "requested", index + 1));
      }
    });
  }

  return rows;
}

function supabaseHeaders(extraHeaders = {}) {
  return {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

function supabaseTableUrl(table, query = "") {
  return `${supabaseRestUrl}/${table}${query}`;
}

async function handleSupabaseResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Supabase HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function listSubmissions() {
  if (storageProvider === "supabase") {
    const response = await fetch(supabaseTableUrl(supabaseSubmissionsTable, "?select=id,submitted_at,payload&order=submitted_at.desc&limit=1000"), {
      headers: supabaseHeaders(),
    });
    const rows = await handleSupabaseResponse(response);
    return rows.map(rowToSubmission);
  }

  if (storageProvider === "postgres" && pool) {
    const result = await pool.query(`
      SELECT id, submitted_at, payload
      FROM submissions
      ORDER BY submitted_at DESC
      LIMIT 1000;
    `);

    return result.rows.map(rowToSubmission);
  }

  const error = new Error("Banco de dados não configurado.");
  error.status = 503;
  throw error;
}

async function upsertSubmission(submission) {
  const row = submissionToDbRow(submission);
  const guestRows = extractGuests(submission);

  if (storageProvider === "supabase") {
    const response = await fetch(supabaseTableUrl(supabaseSubmissionsTable, "?on_conflict=id"), {
      method: "POST",
      headers: supabaseHeaders({
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify(row),
    });
    const rows = await handleSupabaseResponse(response);

    const deleteGuestsResponse = await fetch(supabaseTableUrl(supabaseGuestsTable, `?submission_id=eq.${encodeURIComponent(submission.id)}`), {
      method: "DELETE",
      headers: supabaseHeaders(),
    });
    await handleSupabaseResponse(deleteGuestsResponse);

    if (guestRows.length > 0) {
      const guestsResponse = await fetch(supabaseTableUrl(supabaseGuestsTable), {
        method: "POST",
        headers: supabaseHeaders({
          Prefer: "return=minimal",
        }),
        body: JSON.stringify(guestRows),
      });
      await handleSupabaseResponse(guestsResponse);
    }

    return { ...rowToSubmission(rows[0]), guestsCount: guestRows.length };
  }

  if (storageProvider === "postgres" && pool) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const result = await client.query(
        `
          INSERT INTO submissions (
            id,
            submitted_at,
            form_type,
            full_name,
            team_number,
            whatsapp,
            email,
            status,
            payload
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            submitted_at = EXCLUDED.submitted_at,
            form_type = EXCLUDED.form_type,
            full_name = EXCLUDED.full_name,
            team_number = EXCLUDED.team_number,
            whatsapp = EXCLUDED.whatsapp,
            email = EXCLUDED.email,
            status = EXCLUDED.status,
            payload = EXCLUDED.payload
          RETURNING id, submitted_at, payload;
        `,
        [row.id, row.submitted_at, row.form_type, row.full_name, row.team_number, row.whatsapp, row.email, row.status, row.payload],
      );

      await client.query("DELETE FROM guests WHERE submission_id = $1", [submission.id]);

      for (const guestRow of guestRows) {
        await client.query(
          `
            INSERT INTO guests (
              id,
              submission_id,
              form_type,
              guest_type,
              position,
              full_name,
              cpf,
              whatsapp,
              payload
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
          `,
          [
            guestRow.id,
            guestRow.submission_id,
            guestRow.form_type,
            guestRow.guest_type,
            guestRow.position,
            guestRow.full_name,
            guestRow.cpf,
            guestRow.whatsapp,
            guestRow.payload,
          ],
        );
      }

      await client.query("COMMIT");
      return { ...rowToSubmission(result.rows[0]), guestsCount: guestRows.length };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const error = new Error("Banco de dados não configurado.");
  error.status = 503;
  throw error;
}

async function deleteSubmissions() {
  if (storageProvider === "supabase") {
    const deleteGuestsResponse = await fetch(supabaseTableUrl(supabaseGuestsTable, "?id=not.is.null"), {
      method: "DELETE",
      headers: supabaseHeaders(),
    });
    await handleSupabaseResponse(deleteGuestsResponse);

    const response = await fetch(supabaseTableUrl(supabaseSubmissionsTable, "?id=not.is.null"), {
      method: "DELETE",
      headers: supabaseHeaders(),
    });
    await handleSupabaseResponse(response);
    return;
  }

  if (storageProvider === "postgres" && pool) {
    await pool.query("DELETE FROM submissions;");
    return;
  }

  const error = new Error("Banco de dados não configurado.");
  error.status = 503;
  throw error;
}

app.get("/api/health", async (_request, response) => {
  try {
    if (storageProvider === "supabase") {
      const healthResponse = await fetch(supabaseTableUrl(supabaseSubmissionsTable, "?select=id&limit=1"), {
        headers: supabaseHeaders(),
      });
      await handleSupabaseResponse(healthResponse);
    }

    if (storageProvider === "postgres" && pool) {
      await pool.query("SELECT 1");
    }

    response.json({
      ok: true,
      database: storageProvider !== "none",
      provider: storageProvider,
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.get("/api/submissions", async (_request, response) => {
  try {
    response.json(await listSubmissions());
  } catch (error) {
    response.status(error.status || 500).json({
      error: error instanceof Error ? error.message : "Erro ao listar submissões.",
    });
  }
});

app.post("/api/submissions", async (request, response) => {
  try {
    const submission = normalizeSubmission(request.body);
    response.status(201).json(await upsertSubmission(submission));
  } catch (error) {
    response.status(error.status || 500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar submissão.",
    });
  }
});

app.delete("/api/submissions", async (_request, response) => {
  try {
    await deleteSubmissions();
    response.status(204).send();
  } catch (error) {
    response.status(error.status || 500).json({
      error: error instanceof Error ? error.message : "Erro ao limpar submissões.",
    });
  }
});

app.use(express.static(path.resolve(__dirname, "../dist")));

app.get(/.*/, (_request, response) => {
  response.sendFile(path.resolve(__dirname, "../dist/index.html"));
});

ensureDatabase()
  .then(() => {
    const ports = [...new Set([port, ...fallbackPorts].filter(Boolean))];

    ports.forEach((currentPort) => {
      const server = app.listen(currentPort, "0.0.0.0", () => {
        console.log(`HUB Challenge app running on port ${currentPort}`);
      });

      server.on("error", (error) => {
        console.warn(`Could not listen on port ${currentPort}: ${error.message}`);
      });
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
