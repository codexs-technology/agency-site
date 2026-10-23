import type {
  PaymentEvent,
  PaymentOrder,
  PaymentStore,
} from "./payment-lifecycle";
import { randomToken } from "./security";

/** Event, state and audit are committed in one transactional D1 batch. */
export class D1PaymentStore implements PaymentStore {
  constructor(private db: D1Database) {}
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
