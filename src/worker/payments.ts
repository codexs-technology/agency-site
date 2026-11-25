/** Server-only contract. No provider is enabled or simulated. */
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
export function paymentReadiness() {
  return {
    enabled: false as const,
    provider: "paymegate",
    reason:
      "PayMeGate provider is configured but not operational. " +
      "Official API documentation and credentials are required. " +
      "Contact administration to complete PayMeGate integration.",
  };
}
