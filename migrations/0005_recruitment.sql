-- Additive only; no deletion or replacement of existing applications.
ALTER TABLE job_applications ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE job_applications ADD COLUMN country TEXT NOT NULL DEFAULT '';
ALTER TABLE job_applications ADD COLUMN applicant_location TEXT NOT NULL DEFAULT '';
ALTER TABLE job_applications ADD COLUMN experience TEXT NOT NULL DEFAULT '';
ALTER TABLE job_applications ADD COLUMN skills TEXT NOT NULL DEFAULT '';
ALTER TABLE job_applications ADD COLUMN professional_url TEXT NOT NULL DEFAULT '';
ALTER TABLE job_applications ADD COLUMN resume_key TEXT;
ALTER TABLE job_applications ADD COLUMN cover_file_key TEXT;
ALTER TABLE job_applications ADD COLUMN access_hash TEXT;
ALTER TABLE job_applications ADD COLUMN recruitment_status TEXT NOT NULL DEFAULT 'Received'
 CHECK(recruitment_status IN ('Received','Under Review','Shortlisted','Interview','Offer','Rejected','Withdrawn'));
CREATE UNIQUE INDEX application_access ON job_applications(access_hash) WHERE access_hash IS NOT NULL;