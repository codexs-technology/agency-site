-- Additive: legacy R2 keys remain untouched for owner-managed archival/deletion.
ALTER TABLE job_applications ADD COLUMN delivery_state TEXT NOT NULL DEFAULT 'pending'
 CHECK(delivery_state IN ('pending','failed','sent'));
ALTER TABLE job_applications ADD COLUMN delivery_code TEXT NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE job_applications ADD COLUMN delivery_updated_at TEXT;
ALTER TABLE job_applications ADD COLUMN document_metadata TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(document_metadata));
-- Separate from existing applications: avoids rewriting legacy uniqueness/data.
CREATE TABLE recruitment_replays (
 request_hash TEXT PRIMARY KEY,
 application_id TEXT NOT NULL UNIQUE REFERENCES job_applications(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);