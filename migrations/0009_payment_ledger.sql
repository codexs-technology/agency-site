-- Internal disabled-payment architecture. No prices, orders or provider seeded.
CREATE TABLE payment_ledger_orders (
 id TEXT PRIMARY KEY REFERENCES orders(id), amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
 currency TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','paid','failed','partially_refunded','refunded')),
 refunded_minor INTEGER NOT NULL DEFAULT 0 CHECK(refunded_minor BETWEEN 0 AND amount_minor),
 payment_id TEXT UNIQUE, version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE payment_ledger_events (
 provider TEXT NOT NULL, event_id TEXT NOT NULL, order_id TEXT NOT NULL REFERENCES payment_ledger_orders(id),
 revision INTEGER NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(provider,event_id), UNIQUE(order_id,revision)
);
-- Fail the entire D1 batch on a stale concurrent event, never partially audit it.
CREATE TRIGGER payment_ledger_revision BEFORE INSERT ON payment_ledger_events
WHEN NEW.revision != (SELECT version+1 FROM payment_ledger_orders WHERE id=NEW.order_id)
BEGIN SELECT RAISE(ABORT,'Payment revision conflict'); END;