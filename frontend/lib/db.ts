import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

type SqlClient = NeonQueryFunction<false, false>;

let sqlClient: SqlClient | null = null;

export function getSql(): SqlClient {
  if (sqlClient) return sqlClient;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Add it to your environment before calling DB-backed APIs.',
    );
  }

  sqlClient = neon<false, false>(databaseUrl);
  return sqlClient;
}

// Run once to initialize schema
export async function initSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      wallet_address TEXT PRIMARY KEY,
      coin_public_key TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      key            TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      revoked        BOOLEAN DEFAULT FALSE,
      label          TEXT DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS challenges (
      nonce          TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      expires_at     TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_api_keys_wallet ON api_keys(wallet_address)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      job_id           TEXT PRIMARY KEY,
      wallet_address   TEXT NOT NULL,
      provider_id      TEXT NOT NULL DEFAULT '',
      amount           INTEGER NOT NULL DEFAULT 0,
      model            TEXT NOT NULL DEFAULT '',
      attestation_hash  TEXT,
      prompt_tokens    INTEGER,
      completion_tokens INTEGER,
      duration_ms      INTEGER,
      cpu_percent      REAL,
      ram_mb           REAL,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS attestation_hash TEXT`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_tokens INTEGER`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS duration_ms INTEGER`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cpu_percent REAL`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ram_mb REAL`;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_jobs_wallet ON jobs(wallet_address)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS providers (
      id             TEXT PRIMARY KEY,
      endpoint       TEXT NOT NULL,
      model          TEXT NOT NULL DEFAULT '',
      price          INTEGER NOT NULL DEFAULT 0,
      reputation     REAL NOT NULL DEFAULT 0.5,
      active         BOOLEAN NOT NULL DEFAULT TRUE,
      registered_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE providers ADD COLUMN IF NOT EXISTS hardware JSONB`;
}
