"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";
import { dict } from "@/lib/i18n";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo(dict.auth.checkEmail);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Reset the splash gate so the welcome shows on this fresh login.
        sessionStorage.removeItem("attentt_splash_shown");
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    sessionStorage.removeItem("attentt_splash_shown");
    // Google OAuth also primes calendar access later (§3).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${publicEnv.appUrl}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="app-shell">
      {/* Hero photo sets the premium, warm tone before sign-in (§13). */}
      <div className="relative h-64 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/moment-couch.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/20 to-navy/30" />
        <p className="absolute left-6 top-6 font-display text-sm uppercase tracking-[0.3em] text-cream drop-shadow">
          {dict.brand.name}
        </p>
      </div>

      <div className="-mt-6 flex-1 rounded-t-3xl bg-cream px-6 pt-6 animate-fade-up">
        <h1 className="font-display text-3xl text-navy">
          {mode === "sign-in" ? dict.auth.signInTitle : dict.auth.signUpTitle}
        </h1>
        <p className="mt-1 italic text-navy/60">{dict.brand.tagline}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              {dict.auth.email}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              {dict.auth.password}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-terracotta">{error}</p>}
          {info && <p className="text-sm text-navy/70">{info}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? dict.common.loading : mode === "sign-in" ? dict.auth.signIn : dict.auth.signUp}
          </button>
        </form>

        <button onClick={handleGoogle} className="btn-secondary mt-3 w-full">
          {dict.auth.withGoogle}
        </button>

        <p className="mt-6 text-center text-sm text-navy/60">
          <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"} className="underline">
            {mode === "sign-in" ? dict.auth.toSignUp : dict.auth.toSignIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
