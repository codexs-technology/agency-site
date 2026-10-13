PRAGMA foreign_keys = ON;

CREATE TABLE admins (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin' CHECK(role = 'admin'),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE admin_sessions (
 token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
 csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE contacts (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '', service TEXT NOT NULL, budget TEXT NOT NULL DEFAULT '',
 timeline TEXT NOT NULL, description TEXT NOT NULL, consent INTEGER NOT NULL CHECK(consent=1),
 kind TEXT NOT NULL DEFAULT 'contact' CHECK(kind IN ('contact','consultation')),
 status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New','Contacted','Qualified','Proposal Sent','Won','Lost')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX contacts_created ON contacts(created_at DESC);
CREATE INDEX contacts_status ON contacts(status,created_at DESC);
CREATE TABLE project_inquiries (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '', services_json TEXT NOT NULL CHECK(json_valid(services_json)),
 budget TEXT NOT NULL DEFAULT '', timeline TEXT NOT NULL, description TEXT NOT NULL,
 consent INTEGER NOT NULL CHECK(consent=1),
 status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New','Contacted','Qualified','Proposal Sent','Won','Lost')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX projects_created ON project_inquiries(created_at DESC);
CREATE TABLE newsletter_subscribers (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 consent INTEGER NOT NULL CHECK(consent=1), status TEXT NOT NULL DEFAULT 'subscribed' CHECK(status IN ('subscribed','unsubscribed')),
 unsubscribe_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE services (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 summary TEXT NOT NULL, body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE portfolio_projects (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL,
 summary TEXT NOT NULL, body TEXT NOT NULL, technologies TEXT NOT NULL DEFAULT '',
 image TEXT NOT NULL, is_concept INTEGER NOT NULL DEFAULT 1 CHECK(is_concept IN (0,1)),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE portfolio_images (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
 url TEXT NOT NULL, alt TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE blog_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE);
CREATE TABLE blog_posts (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL,
 body TEXT NOT NULL, category TEXT NOT NULL, author TEXT NOT NULL DEFAULT 'CodesBoxs Editorial',
 image TEXT NOT NULL DEFAULT '/images/engineering.svg',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 published_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX blog_published ON blog_posts(status,published_at DESC);
CREATE TABLE job_openings (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL,
 body TEXT NOT NULL, location TEXT NOT NULL, employment_type TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE job_applications (
 id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_openings(id),
 name TEXT NOT NULL, email TEXT NOT NULL, cover_letter TEXT NOT NULL,
 portfolio_url TEXT NOT NULL DEFAULT '', consent INTEGER NOT NULL CHECK(consent=1),
 status TEXT NOT NULL DEFAULT 'New', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(job_id,email)
);
CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE audit_logs (
 id TEXT PRIMARY KEY, admin_id TEXT REFERENCES admins(id), action TEXT NOT NULL,
 entity TEXT NOT NULL, entity_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_created ON audit_logs(created_at DESC);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX rate_expiry ON rate_limits(expires_at);
CREATE TABLE email_outbox (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, recipient TEXT NOT NULL,
 subject TEXT NOT NULL, text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','blocked','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0,
 last_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, sent_at TEXT
);
CREATE INDEX outbox_pending ON email_outbox(status,next_attempt_at);