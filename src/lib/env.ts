/**
 * Centralised environment access. Server-only secrets are read lazily so the
 * client bundle never trips over a missing key, and so that a misconfigured
 * deploy fails loudly at the point of use rather than silently.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Values safe to read in the browser (NEXT_PUBLIC_*). */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
};

/** Server-only secrets. Calling any getter throws if the var is unset. */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get tokenEncryptionKey() {
    return required("TOKEN_ENCRYPTION_KEY", process.env.TOKEN_ENCRYPTION_KEY);
  },
  get vapidPrivateKey() {
    return required("VAPID_PRIVATE_KEY", process.env.VAPID_PRIVATE_KEY);
  },
  get vapidSubject() {
    return process.env.VAPID_SUBJECT ?? "mailto:hello@attentt.app";
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY);
  },
  get anthropicModel() {
    return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  },
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID);
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET);
  },
  get googleRedirectUri() {
    return process.env.GOOGLE_REDIRECT_URI ?? `${publicEnv.appUrl}/api/calendar/google/callback`;
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY);
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET);
  },
  get stripeSubscriptionPriceId() {
    return required("STRIPE_SUBSCRIPTION_PRICE_ID", process.env.STRIPE_SUBSCRIPTION_PRICE_ID);
  },
  get nudgeCronSecret() {
    return required("NUDGE_CRON_SECRET", process.env.NUDGE_CRON_SECRET);
  },
};

/** When true, the nudge engine compresses day-based timings to minutes (§6). */
export const compressedTimeMode = process.env.NUDGE_COMPRESSED_TIME === "true";
