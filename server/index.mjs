import express from "express";
import { Pool } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set. API requests will fail until a database is configured.");
}

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    })
  : null;

app.use(express.json({ limit: "1mb" }));

async function ensureDatabase() {
  if (!pool) return;

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

app.get("/api/health", async (_request, response) => {
  try {
    if (pool) {
      await pool.query("SELECT 1");
    }

    response.json({
      ok: true,
      database: Boolean(pool),
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.get("/api/submissions", async (_request, response) => {
  if (!pool) {
    response.status(503).json({ error: "DATABASE_URL não configurado." });
    return;
  }

  const result = await pool.query(`
    SELECT id, submitted_at, payload
    FROM submissions
    ORDER BY submitted_at DESC
    LIMIT 1000;
  `);

  response.json(result.rows.map(rowToSubmission));
});

app.post("/api/submissions", async (request, response) => {
  if (!pool) {
    response.status(503).json({ error: "DATABASE_URL não configurado." });
    return;
  }

  try {
    const submission = normalizeSubmission(request.body);

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
      [
        submission.id,
        submission.submittedAt,
        submission.payload.formType,
        submission.payload.fullName || null,
        submission.payload.teamNumber || null,
        submission.payload.whatsapp || null,
        submission.payload.email || null,
        submission.payload.status || null,
        submission.payload,
      ],
    );

    response.status(201).json(rowToSubmission(result.rows[0]));
  } catch (error) {
    response.status(error.status || 500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar submissão.",
    });
  }
});

app.delete("/api/submissions", async (_request, response) => {
  if (!pool) {
    response.status(503).json({ error: "DATABASE_URL não configurado." });
    return;
  }

  await pool.query("DELETE FROM submissions;");
  response.status(204).send();
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
