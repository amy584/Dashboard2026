"use client";

import { useEffect, useState } from "react";
import { dict, t } from "@/lib/i18n";
import { splashSlides } from "@/lib/splash";

const SESSION_KEY = "attent_splash_shown";
const VISIBLE_MS = 3000; // how long it stays before auto-fading
const FADE_MS = 550;

/** 1-based day of the year — drives the per-day slide rotation. */
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((now - start) / 86_400_000);
}

/**
 * Brief, full-screen welcome shown on each login / app open. Picks an on-brand
 * photo + a motivating line, then auto-fades into the app. Tap to skip.
 *
 * Gating: shows once per browser session (sessionStorage). AuthForm clears the
 * flag on sign-in and SettingsPanel clears it on sign-out, so it reappears on
 * every fresh login — matching "iedere keer als de man inlogt".
 *
 * A `?splash=<index>` query param forces a specific slide (handy for marketing
 * captures); it does not affect normal use.
 */
export function LoginSplash({ firstName }: { firstName: string | null }) {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const override = params.get("splash");
    const forced = override !== null && !Number.isNaN(Number(override));

    if (!forced && sessionStorage.getItem(SESSION_KEY)) return; // already shown this session

    // Rotate per day: the same photo + line all day, a different one tomorrow.
    const index = forced
      ? Number(override) % splashSlides.length
      : dayOfYear(new Date()) % splashSlides.length;
    setSlideIndex(index);
    sessionStorage.setItem(SESSION_KEY, "1");

    // Fade in, hold, then fade out.
    requestAnimationFrame(() => setPhase("in"));
    const hold = setTimeout(() => setPhase("out"), VISIBLE_MS);
    return () => clearTimeout(hold);
  }, []);

  useEffect(() => {
    if (phase !== "out") return;
    const id = setTimeout(() => setPhase("hidden"), FADE_MS);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === "hidden") return null;

  const slide = splashSlides[slideIndex];
  const welcome = firstName
    ? t(dict.splash.welcomeBack, { name: firstName })
    : dict.splash.welcome;

  return (
    <div
      role="button"
      aria-label={dict.splash.tapToEnter}
      onClick={() => setPhase("out")}
      className="fixed inset-0 z-50 overflow-hidden bg-navy transition-opacity duration-500"
      style={{ opacity: phase === "in" ? 1 : 0 }}
    >
      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          transform: phase === "in" ? "scale(1.06)" : "scale(1)",
          transition: `transform ${VISIBLE_MS + FADE_MS}ms ease-out`,
        }}
      />
      {/* Legibility gradient: warm at the bottom, navy depth at the top */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-navy/50" />

      {/* Content */}
      <div className="relative mx-auto flex h-full max-w-app flex-col justify-between p-8">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-cream/90">
          {dict.brand.name}
        </p>

        <div className="pb-6">
          <p className="text-sm uppercase tracking-widest text-stone">{welcome}</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-cream">{slide.line}</h1>
          <p className="mt-6 text-xs uppercase tracking-widest text-cream/60">
            {dict.splash.tapToEnter}
          </p>
        </div>
      </div>
    </div>
  );
}
