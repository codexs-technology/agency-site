import { PAYMEGATE, payMeGateConfig } from "./paymegate";
import type { Env } from "./types";

/** Server-only contract. Provider stays disabled unless explicitly configured. */
export type CheckoutOrder = {
  id: string;
  customerEmail: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
};
export type VerifiedPaymentEvent = {
  eventId: string;
  orderId: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  status: "paid" | "failed" | "refunded" | "partially_refunded";
};
export interface PaymentProvider {
  readonly name: string;
  createCheckout(
    order: CheckoutOrder,
    returnUrl: string,
  ): Promise<{ checkoutId: string; hostedUrl: string }>;
  verifyWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<VerifiedPaymentEvent>;
  reconcile(paymentId: string): Promise<VerifiedPaymentEvent>;
  refund(
    paymentId: string,
    amountMinor: number,
    idempotencyKey: string,
  ): Promise<{ refundId: string; status: "pending" | "succeeded" | "failed" }>;
}
/**
 * Public readiness. Disabled unless PAYMENTS_ENABLED is exactly "true" and every
 * PayMeGate setting validates. Never reveals which variable is missing.
 */
export function paymentReadiness(env?: Partial<Env>) {
  if (env?.PAYMENTS_ENABLED !== "true")
    return {
      enabled: false as boolean,
      provider: null as string | null,
      reason:
        "No approved payment provider adapter or credentials configured. Checkout, receipts, refunds and reconciliation are unavailable.",
    };
  const { config } = payMeGateConfig(env);
  if (!config)
    return {
      enabled: false as boolean,
      provider: PAYMEGATE as string | null,
      reason:
        "Online payment is temporarily unavailable. Submit a quote or invoice request instead.",
    };
  return {
    enabled: true as boolean,
    provider: PAYMEGATE as string | null,
    mode: config.mode,
    reason: "",
  };
}
