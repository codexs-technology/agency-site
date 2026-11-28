import type {
  PaymentEvent,
  PaymentOrder,
  PaymentStore,
} from "./payment-lifecycle";
import { randomToken } from "./security";
import { formatMinorAmount } from "../shared/pricing";

export type PaymentStoreOptions = {
  /** Administrator recipient for verified-payment notifications. */
  notificationEmail?: string;
};

const orderStatus = (event: PaymentEvent) =>
  event.state === "failed"
    ? event.outcome
      ? "cancelled"
      : "failed"
    : event.state;
const attemptStatus = (event: PaymentEvent) =>
  event.state === "failed"
    ? event.outcome
      ? "cancelled"
      : "failed"
    : "verified";
const refundStatus = (state: PaymentOrder["state"]) =>
  state === "refunded"
    ? "full"
    : state === "partially_refunded"
      ? "partial"
      : "none";

/**
 * Event, ledger state, order status, payment record, fulfillment, queued email
 * and audit are committed in one transactional D1 batch. The revision trigger on
 * payment_ledger_events aborts the whole batch on a stale concurrent event.
 */
export class D1PaymentStore implements PaymentStore {
  constructor(
    private db: D1Database,
    private options: PaymentStoreOptions = {},
  ) {}
  async eventPayload(provider: string, eventId: string) {
    const row = await this.db
      .prepare(
        "SELECT payload FROM payment_ledger_events WHERE provider=? AND event_id=?",
      )
      .bind(provider, eventId)
      .first<{ payload: string }>();
    return row?.payload ?? null;
  }
  async load(id: string) {
    return this.db
      .prepare(
        "SELECT id,amount_minor AS amountMinor,currency,state,refunded_minor AS refundedMinor,payment_id AS paymentId,version FROM payment_ledger_orders WHERE id=?",
      )
      .bind(id)
      .first<PaymentOrder>();
  }
  /** Statements beyond the ledger that keep orders and fulfillment consistent. */
  private sideEffects(
    provider: string,
    event: PaymentEvent,
    previous: PaymentOrder,
    next: PaymentOrder,
  ) {
    const db = this.db,
      id = previous.id;
    const statements = [
      db
        .prepare(
          "UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        )
        .bind(orderStatus(event), id),
      db
        .prepare(
          "UPDATE payment_attempts SET status=? WHERE order_id=? AND provider=? AND status IN ('pending','created')",
        )
        .bind(attemptStatus(event), id, provider),
    ];
    if (event.state !== "failed")
      // Scoped to the same order so a reused payment ID can never overwrite another order.
      statements.push(
        db
          .prepare(
            `INSERT INTO payment_records(id,order_id,provider,provider_payment_id,status,amount_minor,currency,refund_status,transaction_ref,received_amount,received_currency)
             VALUES(?,?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(provider_payment_id) DO UPDATE SET status=excluded.status,
               refund_status=excluded.refund_status,
               transaction_ref=COALESCE(payment_records.transaction_ref,excluded.transaction_ref),
               received_amount=COALESCE(payment_records.received_amount,excluded.received_amount),
               received_currency=COALESCE(payment_records.received_currency,excluded.received_currency),
               updated_at=CURRENT_TIMESTAMP
             WHERE payment_records.order_id=excluded.order_id`,
          )
          .bind(
            randomToken(),
            id,
            provider,
            event.paymentId,
            next.state,
            next.amountMinor,
            next.currency,
            refundStatus(next.state),
            event.settlement?.transactionRef ?? null,
            event.settlement?.receivedAmount ?? null,
            event.settlement?.receivedCurrency ?? null,
          ),
      );
    const amount = formatMinorAmount(next.amountMinor, next.currency);
    const admin =
      this.options.notificationEmail || "codexstechnology@gmail.com";
    const queueCustomer = (key: string, subject: string, text: string) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO email_outbox(id,kind,recipient,subject,text,status) SELECT ?,?,customer_email,?,?,'pending' FROM orders WHERE id=? AND purpose='customer'",
        )
        .bind(`${provider}:${id}:${key}`, key, subject, text, id);
    const queueAdmin = (key: string, subject: string, text: string) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO email_outbox(id,kind,recipient,subject,text,status) VALUES(?,?,?,?,?,'pending')",
        )
        .bind(`${provider}:${id}:${key}`, key, admin, subject, text);
    if (next.state === "paid" && previous.state !== "paid") {
      // Idempotent: one onboarding record and one message set per order.
      statements.push(
        db
          .prepare(
            // Owner verification orders are never onboarded.
            "INSERT OR IGNORE INTO service_fulfillments(order_id,state) SELECT id,'onboarding' FROM orders WHERE id=? AND purpose='customer'",
          )
          .bind(id),
        queueCustomer(
          "payment-confirmation",
          "CodesBoxs: payment received",
          `We received your verified payment of ${amount}. Order reference: ${id}. Keep your private access key to check the order status at /order-status.`,
        ),
        queueCustomer(
          "onboarding-instructions",
          "CodesBoxs: project onboarding next steps",
          `Thank you for your order (reference ${id}). A CodesBoxs team member will contact you at this email address to schedule onboarding and confirm the written project scope. Reply to this email with any questions.`,
        ),
        queueAdmin(
          "admin-payment-verified",
          "CodesBoxs: verified online payment",
          `A verified ${provider} payment of ${amount} was recorded for order ${id}. Sign in to the administrator dashboard to begin onboarding.`,
        ),
      );
    }
    if (next.state === "partially_refunded" || next.state === "refunded") {
      statements.push(
        db
          .prepare(
            "UPDATE service_fulfillments SET state=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND state!='cancelled'",
          )
          .bind(
            next.state === "refunded" ? "cancelled" : "review_required",
            id,
          ),
        queueAdmin(
          `admin-refund-${next.refundedMinor}`,
          "CodesBoxs: refund recorded",
          `A ${next.state.replace("_", " ")} state (${formatMinorAmount(next.refundedMinor, next.currency)} of ${amount}) was verified for order ${id}. Review service fulfillment in the administrator dashboard.`,
        ),
      );
    }
    return statements;
  }
  async commit(
    provider: string,
    event: PaymentEvent,
    previous: PaymentOrder,
    next: PaymentOrder,
  ): Promise<"applied" | "duplicate"> {
    const payload = JSON.stringify(event);
    const replay = async () => {
      const row = await this.db
        .prepare(
          "SELECT payload FROM payment_ledger_events WHERE provider=? AND event_id=?",
        )
        .bind(provider, event.id)
        .first<{ payload: string }>();
      if (row && row.payload !== payload)
        throw new Error("Event ID reused with different payload");
      return !!row;
    };
    if (await replay()) return "duplicate";
    try {
      await this.db.batch([
        this.db
          .prepare(
            "INSERT INTO payment_ledger_events(provider,event_id,order_id,revision,payload) VALUES(?,?,?,?,?)",
          )
          .bind(provider, event.id, previous.id, previous.version + 1, payload),
        this.db
          .prepare(
            "UPDATE payment_ledger_orders SET state=?,refunded_minor=?,payment_id=?,version=version+1 WHERE id=? AND version=?",
          )
          .bind(
            next.state,
            next.refundedMinor,
            next.paymentId,
            previous.id,
            previous.version,
          ),
        ...this.sideEffects(provider, event, previous, next),
        this.db
          .prepare(
            "INSERT INTO audit_logs(id,action,entity,entity_id) VALUES(?,?,?,?)",
          )
          .bind(
            randomToken(),
            `verified_payment_${next.state}`,
            "payment_ledger_orders",
            previous.id,
          ),
      ]);
      return "applied";
    } catch (error) {
      if (await replay()) return "duplicate";
      throw error;
    }
  }
}
