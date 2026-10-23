import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { D1PaymentStore } from "../src/worker/payment-store";
import {
  nextPaymentState,
  type PaymentEvent,
} from "../src/worker/payment-lifecycle";

/** Real SQLite constraints and transactions behind the minimal D1 interface. */
function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync("migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort())
    sql.exec(readFileSync(`migrations/${file}`, "utf8"));
  sql.exec(
    "INSERT INTO orders(id,customer_email,amount_minor,currency,idempotency_key) VALUES('one','test@example.invalid',1000,'USD','one'),('two','test@example.invalid',1000,'USD','two'); INSERT INTO payment_ledger_orders(id,amount_minor,currency,state) VALUES('one',1000,'USD','pending'),('two',1000,'USD','pending')",
  );
  const prepare = (query: string) => {
    let values: (string | number | null)[] = [];
    return {
      bind(...input: (string | number | null)[]) {
        values = input;
        return this;
      },
      async first() {
        return sql.prepare(query).get(...values) ?? null;
      },
      execute() {
        return sql.prepare(query).run(...values);
      },
    };
  };
  const db = {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      sql.exec("BEGIN");
      try {
        const results = statements.map((statement) => statement.execute());
        sql.exec("COMMIT");
        return results;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { sql, store: new D1PaymentStore(db) };
}
describe("durable mock sandbox payment ledger", () => {
  it("commits state/event/audit once and rejects conflicting replay", async () => {
    const { sql, store } = database();
    try {
      const order = (await store.load("one"))!;
      const event: PaymentEvent = {
        id: "evt",
        orderId: "one",
        paymentId: "pay",
        amountMinor: 1000,
        currency: "USD",
        refundedMinor: 0,
        state: "paid",
      };
      const next = nextPaymentState(order, event);
      expect(await store.commit("mock", event, order, next)).toBe("applied");
      expect(await store.commit("mock", event, order, next)).toBe("duplicate");
      await expect(
        store.commit("mock", { ...event, amountMinor: 1 }, order, next),
      ).rejects.toThrow("different payload");
      expect(sql.prepare("SELECT count(*) AS n FROM audit_logs").get()?.n).toBe(
        1,
      );
      expect((await store.load("one"))?.state).toBe("paid");
    } finally {
      sql.close();
    }
  });
  it("rolls back stale writes and duplicate charges without orphan audit entries", async () => {
    const { sql, store } = database();
    try {
      const first = (await store.load("one"))!;
      const second = (await store.load("two"))!;
      const event: PaymentEvent = {
        id: "evt",
        orderId: "one",
        paymentId: "pay",
        amountMinor: 1000,
        currency: "USD",
        refundedMinor: 0,
        state: "paid",
      };
      await store.commit("mock", event, first, nextPaymentState(first, event));
      await expect(
        store.commit(
          "mock",
          { ...event, id: "race" },
          first,
          nextPaymentState(first, event),
        ),
      ).rejects.toThrow();
      const duplicate = { ...event, id: "other", orderId: "two" };
      await expect(
        store.commit(
          "mock",
          duplicate,
          second,
          nextPaymentState(second, duplicate),
        ),
      ).rejects.toThrow();
      expect((await store.load("two"))?.state).toBe("pending");
      expect(
        sql.prepare("SELECT count(*) AS n FROM payment_ledger_events").get()?.n,
      ).toBe(1);
      expect(sql.prepare("SELECT count(*) AS n FROM audit_logs").get()?.n).toBe(
        1,
      );
    } finally {
      sql.close();
    }
  });
});
