"use client";

import { publicEnv } from "@/lib/env";

/** Register the service worker (idempotent). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Ask for notification permission, subscribe to push, and persist the
 * subscription server-side. Returns true on success. Degrades gracefully where
 * Web Push is unavailable (older iOS, §11) — caller falls back to in-app.
 */
export async function enablePush(): Promise<boolean> {
  if (typeof window === "undefined" || !("PushManager" in window)) return false;
  if (!publicEnv.vapidPublicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey) as BufferSource,
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
  });
  return res.ok;
}
