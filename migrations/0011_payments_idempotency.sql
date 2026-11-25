-- 0011_payments_idempotency.sql
-- Additive: Creates payments table and webhook event idempotency
-- Never modifies existing data; only adds new tables

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES project_inquiries(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('paymegate')),
  provider_payment_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  currency TEXT NOT NULL CHECK(currency IN ('USD','EUR','GBP','PKR','AED','CAD','AUD')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','refunded','partially_refunded')),
  customer_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX payments_order_idx ON payments(order_id);
CREATE INDEX payments_provider_idx ON payments(provider);
CREATE INDEX payments_status_idx ON payments(status);
CREATE INDEX payments_created_idx ON payments(created_at DESC);

-- Webhook event idempotency: prevents duplicate webhook processing
-- Mirrors the inquiry_requests pattern from 0004_inquiry_idempotency.sql

CREATE TABLE paymegate_webhook_events (
  event_id TEXT PRIMARY KEY,
  provider_payment_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  currency TEXT NOT NULL CHECK(currency IN ('USD','EUR','GBP','PKR','AED','CAD','AUD')),
  event_type TEXT NOT NULL CHECK(event_type IN ('payment.created','payment.paid','payment.failed','payment.refunded')),
  received_at INTEGER NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  UNIQUE(provider_payment_id, event_type)
);

CREATE INDEX webhook_events_processed_idx ON paymegate_webhook_events(processed);