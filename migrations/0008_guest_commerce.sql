-- Additive. No seed prices, customer changes, destructive statements or card data.
ALTER TABLE pricing_packages ADD COLUMN service_slug TEXT NOT NULL DEFAULT '';
ALTER TABLE pricing_packages ADD COLUMN billing_interval TEXT NOT NULL DEFAULT '';
CREATE TABLE currency_snapshots (
 id TEXT PRIMARY KEY CHECK(id='USD'), payload TEXT NOT NULL CHECK(json_valid(payload)),
 updated_at INTEGER NOT NULL, next_update INTEGER NOT NULL
);
CREATE TABLE currency_refresh_lock (
 id TEXT PRIMARY KEY CHECK(id='USD'), retry_after INTEGER NOT NULL
);
CREATE TABLE guest_customers (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, country TEXT NOT NULL,
 company TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE guest_carts (
 id TEXT PRIMARY KEY, access_hash TEXT NOT NULL UNIQUE, items_json TEXT NOT NULL CHECK(json_valid(items_json)),
 fingerprint TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE guest_requests (
 id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES guest_customers(id),
 cart_id TEXT NOT NULL UNIQUE REFERENCES guest_carts(id), access_hash TEXT NOT NULL UNIQUE,
 request_type TEXT NOT NULL CHECK(request_type IN ('quote','invoice')),
 status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','responded','cancelled')),
 display_currency TEXT NOT NULL CHECK(display_currency IN ('USD','PKR','EUR','GBP','AED')),
 policies_version TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
 idempotency_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX guest_requests_customer ON guest_requests(customer_id,created_at);
CREATE TABLE guest_request_items (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES guest_requests(id),
 package_id TEXT REFERENCES pricing_packages(id), service_slug TEXT NOT NULL,
 title TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 amount_minor INTEGER CHECK(amount_minor IS NULL OR amount_minor>=0), currency TEXT NOT NULL,
 billing TEXT NOT NULL, snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json))
);
CREATE INDEX guest_items_request ON guest_request_items(request_id);
CREATE TABLE payment_attempts (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), provider TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('sandbox','production')),
 idempotency_key TEXT NOT NULL UNIQUE, provider_reference TEXT UNIQUE,
 status TEXT NOT NULL CHECK(status IN ('pending','created','failed','cancelled','verified')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX payment_attempts_order ON payment_attempts(order_id,created_at);
-- Requests are not paid orders. Existing orders/payment_records/payment_events remain authoritative.