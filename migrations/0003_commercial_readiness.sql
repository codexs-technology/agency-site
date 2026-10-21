-- Additive only. Existing customers, inquiries and content are preserved.
CREATE TABLE pricing_packages (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 description TEXT NOT NULL, features_json TEXT NOT NULL CHECK(json_valid(features_json)),
 amount_minor INTEGER CHECK(amount_minor IS NULL OR amount_minor >= 0),
 currency TEXT NOT NULL DEFAULT 'USD', billing TEXT NOT NULL DEFAULT 'one_time' CHECK(billing IN ('one_time','recurring','quote')),
 delivery TEXT NOT NULL DEFAULT '', revisions TEXT NOT NULL DEFAULT '', exclusions TEXT NOT NULL DEFAULT '', disclosures TEXT NOT NULL DEFAULT '',
 approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0,1)),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO pricing_packages(id,slug,title,description,features_json,billing) VALUES
 ('starter','starter','Starter','For small businesses and starter projects.','["Basic website or landing page","Responsive design","Contact form","Basic SEO setup","Up to 2 revisions"]','quote'),
 ('business','business','Business','For growing businesses.','["Advanced website or web application","Custom UI/UX design","SEO optimization","CMS integration where applicable","Up to 5 revisions"]','quote'),
 ('enterprise','enterprise','Enterprise','For larger and more complex solutions.','["Custom software or SaaS consultation","AI integration options","Advanced functionality","Dedicated project planning","Scope-based revisions"]','quote');
CREATE TABLE testimonials (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '',
 review TEXT NOT NULL, permission_reference TEXT NOT NULL DEFAULT '', verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0,1)),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE compliance_items (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, evidence TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'incomplete' CHECK(status IN ('incomplete','review','verified')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO compliance_items(id,title) VALUES
 ('legal-identity','Confirm website, contracting entity and merchant account are CodesBoxs SMC Pvt Ltd'),
 ('registration','Provide genuine registration evidence and jurisdiction'),
 ('contacts','Verify support email, phone and any required business address'),
 ('policies','Approve privacy, terms, refund, cancellation and service delivery policies'),
 ('pricing','Approve exact deliverables, amounts, currency, billing, taxes and exclusions'),
 ('portfolio','Verify project ownership, scope, assets and publication permission'),
 ('testimonials','Obtain authentic review evidence and publication consent'),
 ('payments','Approve provider account and authorize checkout/webhook/refund testing'),
 ('security','Verify production Turnstile, admin initialization and session security'),
 ('delivery','Verify notification provider and receipt delivery'),
 ('accessibility','Complete responsive, keyboard and accessibility acceptance checks');
CREATE TABLE orders (
 id TEXT PRIMARY KEY, package_id TEXT REFERENCES pricing_packages(id), customer_email TEXT NOT NULL,
 amount_minor INTEGER NOT NULL CHECK(amount_minor>=0), currency TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','checkout_created','paid','failed','cancelled','refunded','partially_refunded')),
 idempotency_key TEXT NOT NULL UNIQUE, provider TEXT, provider_checkout_id TEXT UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX orders_customer ON orders(customer_email,created_at DESC);
CREATE TABLE payment_records (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), provider TEXT NOT NULL,
 provider_payment_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL, amount_minor INTEGER NOT NULL,
 currency TEXT NOT NULL, refund_status TEXT NOT NULL DEFAULT 'none',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE payment_events (
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_event_id TEXT NOT NULL,
 order_id TEXT REFERENCES orders(id), event_type TEXT NOT NULL, processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(provider,provider_event_id)
);