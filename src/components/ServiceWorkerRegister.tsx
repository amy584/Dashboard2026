"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push";

/** Registers the PWA service worker once on mount (§11). Renders nothing. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker().catch(() => {});
  }, []);
  return null;
}
