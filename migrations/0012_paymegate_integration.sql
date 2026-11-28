-- PayMeGate integration. Additive only: no existing rows, prices or tables are changed.
-- Numbered 0012 so it never shares a number with the unapplied review-branch file
-- 0011_payments_idempotency.sql, which must not be merged (it duplicates this ledger).

-- Online orders: private hashed customer access, one order per server-validated cart,
-- environment isolation and an immutable line snapshot.
ALTER TABLE orders ADD COLUMN access_hash TEXT;
ALTER TABLE orders ADD COLUMN cart_id TEXT REFERENCES guest_carts(id);
ALTER TABLE orders ADD COLUMN mode TEXT CHECK(mode IS NULL OR mode IN ('sandbox','production'));
ALTER TABLE orders ADD COLUMN customer_name TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN items_json TEXT CHECK(items_json IS NULL OR json_valid(items_json));
-- 'verification' = owner-initiated, capped live test order (never onboarded or emailed to a customer).
ALTER TABLE orders ADD COLUMN purpose TEXT NOT NULL DEFAULT 'customer' CHECK(purpose IN ('customer','verification'));
CREATE UNIQUE INDEX orders_access ON orders(access_hash) WHERE access_hash IS NOT NULL;
CREATE UNIQUE INDEX orders_cart ON orders(cart_id) WHERE cart_id IS NOT NULL;
-- At most one open owner verification order per environment.
CREATE UNIQUE INDEX orders_open_verification ON orders(mode)
 WHERE purpose='verification' AND status IN ('pending','checkout_created');

-- Hosted checkout session per attempt. At most one open attempt per order prevents
-- concurrent requests from creating duplicate provider orders.
ALTER TABLE payment_attempts ADD COLUMN checkout_url TEXT;
ALTER TABLE payment_attempts ADD COLUMN claimed_at INTEGER;
ALTER TABLE payment_attempts ADD COLUMN last_checked_at INTEGER;
CREATE UNIQUE INDEX payment_attempts_open ON payment_attempts(order_id)
 WHERE status IN ('pending','created');

-- Provider settlement detail, kept as exact decimal strings (never floats). The
-- received amount/currency may legitimately differ from the order amount (fees,
-- settlement currency), so they are recorded, not compared as equivalent.
ALTER TABLE payment_records ADD COLUMN transaction_ref TEXT;
-- Settlement may be crypto (non-ISO codes such as USDT, up to 18 decimals).
ALTER TABLE payment_records ADD COLUMN received_amount TEXT
 CHECK(received_amount IS NULL OR (received_amount GLOB '[0-9]*' AND length(received_amount)<=49));
ALTER TABLE payment_records ADD COLUMN received_currency TEXT
 CHECK(received_currency IS NULL OR (length(received_currency) BETWEEN 2 AND 12 AND received_currency=upper(received_currency)));

-- Every authenticated webhook delivery is stored once by provider event ID before
-- processing, so nothing verified is lost and anomalies are quarantined for review.
CREATE TABLE payment_webhook_inbox (
 provider TEXT NOT NULL, event_id TEXT NOT NULL, event_type TEXT NOT NULL,
 signed_at INTEGER NOT NULL, received_at INTEGER NOT NULL,
 payload_hash TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)),
 status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','applied','duplicate','review','ignored')),
 detail TEXT NOT NULL DEFAULT '', processed_at INTEGER,
 PRIMARY KEY(provider,event_id)
);
CREATE INDEX webhook_inbox_status ON payment_webhook_inbox(status,received_at);

-- Service onboarding is created only inside the verified-payment transaction.
CREATE TABLE service_fulfillments (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 state TEXT NOT NULL CHECK(state IN ('onboarding','review_required','cancelled')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
