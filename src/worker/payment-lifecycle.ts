/** Provider-neutral internal architecture. Not mounted as a public route. */
export type PaymentState =
  "pending" | "paid" | "failed" | "partially_refunded" | "refunded";
export type PaymentOrder = {
  id: string;
  amountMinor: number;
  currency: string;
  state: PaymentState;
  refundedMinor: number;
  paymentId: string | null;
  version: number;
};
export type PaymentEvent = {
  id: string;
  orderId: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  state: "paid" | "failed" | "partially_refunded" | "refunded";
  /** Cumulative verified refunds, not the current refund delta. */
  refundedMinor: number;
  /** For state "failed": provider reported the checkout expired or cancelled (no charge). */
  outcome?: "expired" | "cancelled";
  /** Provider settlement as exact decimal strings; may differ from amount/currency. */
  settlement?: {
    receivedAmount: string | null;
    receivedCurrency: string | null;
    transactionRef: string | null;
  };
};
export interface VerifiedProviderAdapter {
  readonly name: string;
  /** Must authenticate raw bytes/signature, timestamp/replay window and merchant identity. */
  verifyWebhook(raw: string, headers: Headers): Promise<PaymentEvent>;
  reconcile(paymentId: string): Promise<PaymentEvent>;
}
export interface PaymentStore {
  load(id: string): Promise<PaymentOrder | null>;
  eventPayload(provider: string, eventId: string): Promise<string | null>;
  /** Atomic CAS + globally unique provider event/payment IDs + durable audit entry. */
  commit(
    provider: string,
    event: PaymentEvent,
    previous: PaymentOrder,
    next: PaymentOrder,
  ): Promise<"applied" | "duplicate">;
}
export function authoritativeTotal(
  lines: {
    amountMinor: number | null;
    quantity: number;
    currency: string;
    approved: boolean;
    billing: string;
  }[],
) {
  if (!lines.length) throw new Error("Empty order");
  const currency = lines[0].currency;
  let amountMinor = 0;
  for (const line of lines) {
    if (
      !line.approved ||
      line.billing !== "one_time" ||
      line.currency !== currency ||
      line.amountMinor === null ||
      !Number.isSafeInteger(line.amountMinor) ||
      line.amountMinor <= 0 ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 10
    )
      throw new Error("Order requires approved single-currency one-time terms");
    amountMinor += line.amountMinor * line.quantity;
    if (!Number.isSafeInteger(amountMinor)) throw new Error("Order overflow");
  }
  return { amountMinor, currency };
}
export function nextPaymentState(
  order: PaymentOrder,
  event: PaymentEvent,
): PaymentOrder {
  if (
    order.id !== event.orderId ||
    order.currency !== event.currency ||
    order.amountMinor !== event.amountMinor ||
    !event.id ||
    !event.paymentId ||
    !Number.isSafeInteger(event.refundedMinor) ||
    event.refundedMinor < order.refundedMinor ||
    event.refundedMinor > order.amountMinor ||
    (order.paymentId && order.paymentId !== event.paymentId)
  )
    throw new Error("Payment identity, total or refund mismatch");
  const allowed: Record<PaymentState, PaymentState[]> = {
    pending: ["paid", "failed"],
    paid: ["paid", "partially_refunded", "refunded"],
    failed: ["failed"],
    partially_refunded: ["partially_refunded", "refunded"],
    refunded: ["refunded"],
  };
  if (
    !allowed[order.state].includes(event.state) ||
    (event.state === "refunded" && event.refundedMinor !== order.amountMinor) ||
    (event.state === "partially_refunded" &&
      (event.refundedMinor <= 0 || event.refundedMinor >= order.amountMinor)) ||
    ((event.state === "paid" || event.state === "failed") &&
      event.refundedMinor !== 0)
  )
    throw new Error("Invalid payment lifecycle transition");
  return {
    ...order,
    state: event.state,
    paymentId: event.paymentId,
    refundedMinor: event.refundedMinor,
    version: order.version + 1,
  };
}
export async function processVerifiedWebhook(
  adapter: VerifiedProviderAdapter,
  store: PaymentStore,
  raw: string,
  headers: Headers,
) {
  const event = await adapter.verifyWebhook(raw, headers);
  const previousEvent = await store.eventPayload(adapter.name, event.id);
  if (previousEvent !== null) {
    if (previousEvent !== JSON.stringify(event))
      throw new Error("Event ID reused with different payload");
    return "duplicate";
  }
  const order = await store.load(event.orderId);
  if (!order) throw new Error("Unknown order");
  const next = nextPaymentState(order, event);
  return store.commit(adapter.name, event, order, next);
}
