/**
 * NotificationSender interface (§6/§14). Abstracts the delivery channel so
 * native push (APNs/FCM) can replace Web Push later without touching the
 * escalation engine.
 */

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  nudgeId?: string | null;
  tag?: string;
}

export interface SendResult {
  target: PushTarget;
  ok: boolean;
  /** True when the subscription is gone (404/410) and should be deleted. */
  expired: boolean;
  error?: string;
}

export interface NotificationSender {
  send(target: PushTarget, payload: NotificationPayload): Promise<SendResult>;
  sendMany(targets: PushTarget[], payload: NotificationPayload): Promise<SendResult[]>;
}
