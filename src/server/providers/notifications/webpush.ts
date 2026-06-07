import webpush from "web-push";
import { publicEnv, serverEnv } from "@/lib/env";
import type {
  NotificationPayload,
  NotificationSender,
  PushTarget,
  SendResult,
} from "./types";

/** Web Push (VAPID) implementation of NotificationSender (§11). */
export class WebPushSender implements NotificationSender {
  constructor() {
    webpush.setVapidDetails(
      serverEnv.vapidSubject,
      publicEnv.vapidPublicKey,
      serverEnv.vapidPrivateKey,
    );
  }

  async send(target: PushTarget, payload: NotificationPayload): Promise<SendResult> {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(payload),
      );
      return { target, ok: true, expired: false };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      const expired = statusCode === 404 || statusCode === 410;
      return { target, ok: false, expired, error: (err as Error).message };
    }
  }

  async sendMany(targets: PushTarget[], payload: NotificationPayload): Promise<SendResult[]> {
    return Promise.all(targets.map((t) => this.send(t, payload)));
  }
}

/** No-op sender used when VAPID keys are absent (local dev/tests). */
export class NoopSender implements NotificationSender {
  async send(target: PushTarget): Promise<SendResult> {
    return { target, ok: true, expired: false };
  }
  async sendMany(targets: PushTarget[]): Promise<SendResult[]> {
    return targets.map((target) => ({ target, ok: true, expired: false }));
  }
}

export function getNotificationSender(): NotificationSender {
  if (publicEnv.vapidPublicKey && process.env.VAPID_PRIVATE_KEY) return new WebPushSender();
  return new NoopSender();
}
