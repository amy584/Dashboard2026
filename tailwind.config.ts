import type { Config } from "tailwindcss";

/**
 * Attent brand kit tokens (§13).
 * Palette: Terracotta (primary/CTA), Signature Navy (typography/bg, not black),
 * Soft Cream (surfaces), Stone Taupe (secondary text/icons). Warm, premium,
 * simple, thoughtful — Aesop / Aman / Buck Mason register.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terracotta: "#C96E4B", // primary brand — logo, CTA, highlights
        navy: "#0F2740", // Signature Navy — typography, app bg, premium accents
        cream: "#F2ECE4", // Soft Cream — surfaces/backgrounds
        stone: "#7A6E63", // Stone Taupe — secondary text, icons, supporting
        // `sand` is a derived warm neutral (between cream and stone) used for
        // the outer frame, chips and hairline borders — not a kit colour.
        sand: "#E4D9CC",
      },
      fontFamily: {
        // Logo + headlines: Canela (commercial, self-hosted via @font-face).
        // Playfair Display is loaded as a graceful fallback until Canela ships.
        display: ["Canela", "var(--font-playfair)", "Georgia", "serif"],
        // UI + body: Inter (Medium for UI, Regular for body — by weight).
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        // Mobile-first content column (§13: max ~480px).
        app: "480px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
