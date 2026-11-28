export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  PUBLIC_SITE_URL: string;
  LOCAL_TEST_MODE?: string;
  ADMIN_BOOTSTRAP_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  NOTIFICATION_EMAIL?: string;
  SEND_CONFIRMATIONS?: string;
  CAREERS_WEBHOOK_URL?: string;
  CAREERS_WEBHOOK_SECRET?: string;
  APPLICATION_UPLOADS_APPROVED?: string;
  /** Feature flag. Online payment stays off unless exactly "true". */
  PAYMENTS_ENABLED?: string;
  /** "sandbox" (pmg_test_ keys), or "live"/"production" (live keys; same environment). */
  PAYMEGATE_MODE?: string;
  /** Documented Merchant API base including /v1, e.g. https://api.codesboxs.com/v1 */
  PAYMEGATE_API_BASE_URL?: string;
  /** Exact origin of returned hosted checkout URLs, e.g. https://pay.codesboxs.com */
  PAYMEGATE_CHECKOUT_ORIGIN?: string;
  PAYMEGATE_WORKSPACE?: string;
  /** Comma-separated paymentMethodsKeys required by POST /v1/orders, or "*". */
  PAYMEGATE_PAYMENT_METHODS?: string;
  /** Secret. Scoped merchant API key sent as X-API-Key. */
  PAYMEGATE_API_KEY?: string;
  /** Secret. HMAC-SHA256 key for X-Paymegate-Signature. */
  PAYMEGATE_WEBHOOK_SECRET?: string;
  /** Optional secret. Previous signing secret, accepted only during rotation. */
  PAYMEGATE_WEBHOOK_SECRET_PREVIOUS?: string;
  /** Owner-only capped live verification orders; off unless exactly "true". */
  PAYMEGATE_VERIFICATION_ENABLED?: string;
  /** Optional. When set, authenticated order responses must match this merchantId. */
  PAYMEGATE_MERCHANT_ID?: string;
};
export type Session = {
  admin_id: string;
  email: string;
  csrf_token: string;
  token_hash: string;
};
export type AppEnv = {
  Bindings: Env;
  Variables: { session: Session; requestId: string };
};
