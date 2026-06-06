import type { Config } from "tailwindcss";

/**
 * Attentt brand tokens (§13). Matches the palette from the attentt-story
 * artifact: warm, premium, calm. Navy reassurance, terracotta as the
 * action/escalation accent, cream surfaces.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1F2A44",
        terracotta: "#C96E4B",
        cream: "#F6F2EB",
        sand: "#DCCFC0",
        brass: "#C6A26B",
        ink: "#23211E",
      },
      fontFamily: {
        // Loaded via next/font in layout.tsx and exposed as CSS variables.
        display: ["var(--font-playfair)", "Georgia", "serif"],
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
