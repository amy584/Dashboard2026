import { dict } from "@/lib/i18n";

/**
 * Splash slides shown briefly on each login / app open. Each photo is paired
 * (by index) with a motivating line from the i18n dictionary, so all copy stays
 * centralised. Photos live in /public/images.
 */
export interface SplashSlide {
  image: string;
  line: string;
}

// Order matters: paired by index with dict.splash.lines. Index 0 (breakfast)
// is the favourite and also the sign-in hero.
const IMAGES = [
  "/images/moment-breakfast.png", // intimate small gesture
  "/images/moment-yacht.png", // grand celebration
  "/images/moment-app.png", // using Attent together
  "/images/moment-gift.png", // the gift moment
  "/images/moment-dinner.png", // date night
];

export const splashSlides: SplashSlide[] = IMAGES.map((image, i) => ({
  image,
  line: dict.splash.lines[i] ?? dict.brand.tagline,
}));

/** Pick a slide — rotating so consecutive logins don't repeat the same one. */
export function pickSlide(seed = Date.now()): SplashSlide {
  return splashSlides[Math.floor(seed / 1000) % splashSlides.length];
}
