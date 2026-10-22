-- Additive replay protection. No existing lead or content data is changed.
CREATE TABLE inquiry_requests (
  request_key TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  inquiry_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);