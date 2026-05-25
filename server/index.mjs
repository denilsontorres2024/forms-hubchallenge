import express from "express";
import { Pool } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
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
const storageProvider = supabaseRestUrl && supabaseSecretKey ? "supabase" : databaseUrl ? "postgres" : "none";

if (storageProvider === "none") {
  console.warn("No database configured. Set Supabase variables or DATABASE_URL.");
}

console.log(
  `Storage provider: ${storageProvider}; Supabase URL: ${supabaseRestUrl ? "configured" : "missing"}; Supabase key: ${
    supabaseSecretKey ? "configured" : "missing"
  }; table: ${supabaseSubmissionsTable}`,
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

function supabaseHeaders(extraHeaders = {}) {
  return {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

function supabaseTableUrl(query = "") {
  return `${supabaseRestUrl}/${supabaseSubmissionsTable}${query}`;
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
    const response = await fetch(supabaseTableUrl("?select=id,submitted_at,payload&order=submitted_at.desc&limit=1000"), {
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

  if (storageProvider === "supabase") {
    const response = await fetch(supabaseTableUrl("?on_conflict=id"), {
      method: "POST",
      headers: supabaseHeaders({
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify(row),
    });
    const rows = await handleSupabaseResponse(response);
    return rowToSubmission(rows[0]);
  }

  if (storageProvider === "postgres" && pool) {
    const result = await pool.query(
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

    return rowToSubmission(result.rows[0]);
  }

  const error = new Error("Banco de dados não configurado.");
  error.status = 503;
  throw error;
}

async function deleteSubmissions() {
  if (storageProvider === "supabase") {
    const response = await fetch(supabaseTableUrl("?id=not.is.null"), {
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
      const healthResponse = await fetch(supabaseTableUrl("?select=id&limit=1"), {
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
    app.listen(port, "0.0.0.0", () => {
      console.log(`HUB Challenge app running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
