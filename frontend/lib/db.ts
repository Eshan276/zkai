import { neon } from '@neondatabase/serverless';

// Set DATABASE_URL in .env.local (Neon connection string)
const sql = neon(process.env.DATABASE_URL!);

export { sql };

// Run once to initialize schema
export async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      wallet_address TEXT PRIMARY KEY,
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
      job_id         TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      provider_id    TEXT NOT NULL DEFAULT '',
      amount         INTEGER NOT NULL DEFAULT 0,
      model          TEXT NOT NULL DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_jobs_wallet ON jobs(wallet_address)
  `;
}
