ALTER TABLE newsletter_subscribers ADD COLUMN confirmed_at TEXT;
CREATE TABLE newsletter_confirmations (
 email TEXT PRIMARY KEY COLLATE NOCASE,
 token_hash TEXT NOT NULL UNIQUE,
 expires_at INTEGER NOT NULL,
 confirmed_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Legacy subscribers are not silently marked confirmed. Administrative exports
-- and future campaigns must explicitly require confirmed_at IS NOT NULL.