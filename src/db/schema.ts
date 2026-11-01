/** Money is stored as integer paise. Dates as epoch milliseconds. */
export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  income INTEGER NOT NULL DEFAULT 0,
  salary_day INTEGER NOT NULL DEFAULT 1,
  roast_language TEXT NOT NULL DEFAULT 'mix',
  onboarding_done INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  monthly_limit INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,
  category_id INTEGER,
  payee TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('qr','p2p','sms','manual')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled')),
  sms_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_tx_cat ON transactions (category_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_sms_hash ON transactions (sms_hash) WHERE sms_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS payee_memory (
  payee_normalized TEXT PRIMARY KEY,
  category_id INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS classifier_tokens (
  token TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (token, category_id)
);
CREATE TABLE IF NOT EXISTS classifier_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS level_alerts (
  scope TEXT NOT NULL,
  cycle_start INTEGER NOT NULL,
  level TEXT NOT NULL,
  PRIMARY KEY (scope, cycle_start)
);
CREATE TABLE IF NOT EXISTS savings_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,
  payee TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS roast_history (
  roast_id TEXT NOT NULL,
  shown_at INTEGER NOT NULL
);
`;
