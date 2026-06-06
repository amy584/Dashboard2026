// Screenshots for the login splash + refreshed sign-in screen.
// Usage: node scripts/dev-shots-splash.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE_URL || "http://localhost:3000";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });
const USER = { email: "daan@attentt.test", password: "attentt123" };

async function shoot(page, name, settle = 900) {
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot:", name);
}

const main = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 2,
    locale: "nl-NL",
  });
  const page = await context.newPage();

  // Refreshed sign-in screen with hero photo (logged out)
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  await shoot(page, "10-sign-in-hero");

  // Sign in → the natural login splash fires on entry to the app
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.password);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.click('button[type="submit"]'),
  ]);
  await shoot(page, "11-splash-on-login", 1100); // capture mid-display
  await page.waitForTimeout(3500); // let it auto-fade away

  // Forced variants to show each photo + line (?splash=N)
  for (const i of [0, 2, 3]) {
    await page.goto(`${BASE}/?splash=${i}`, { waitUntil: "networkidle" });
    await shoot(page, `12-splash-variant-${i}`, 1100);
    await page.waitForTimeout(3500);
  }

  await browser.close();
  console.log("done");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
