// Captures mobile screenshots of the running app. Usage: node scripts/dev-shots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE_URL || "http://localhost:3000";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const PRIMARY = { email: "daan@attentt.test", password: "attentt123" };
const NEWUSER = { email: "nieuw@attentt.test", password: "attentt123" };

async function shoot(page, name) {
  await page.waitForTimeout(900); // let fonts + fade-in settle
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot:", name);
}

async function signIn(page, { email, password }) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1200);
}

async function signOutViaCookies(context) {
  await context.clearCookies();
}

const main = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 2,
    locale: "nl-NL",
  });
  const page = await context.newPage();

  // 1. Public sign-in screen
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  await shoot(page, "01-sign-in");

  // 2. Authenticated app as the fully-seeded user
  await signIn(page, PRIMARY);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shoot(page, "02-home-today");

  await page.goto(`${BASE}/dates`, { waitUntil: "networkidle" });
  await shoot(page, "03-dates");

  await page.goto(`${BASE}/her`, { waitUntil: "networkidle" });
  await shoot(page, "04-her-cheatsheet");

  await page.goto(`${BASE}/inspiration`, { waitUntil: "networkidle" });
  await shoot(page, "05-inspiration");

  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await shoot(page, "06-settings");

  // 3. Outsource flow for the seeded nudge
  if (process.env.NUDGE_ID) {
    await page.goto(`${BASE}/outsource/${process.env.NUDGE_ID}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500); // draft assembly (calendar/AI)
    await shoot(page, "07-outsource");
  }

  // 4. Onboarding as the partner-less user
  await signOutViaCookies(context);
  await signIn(page, NEWUSER);
  await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
  await shoot(page, "08-onboarding-1");
  // advance a couple of steps
  const next = page.getByRole("button", { name: /Volgende/ });
  if (await next.count()) {
    await next.first().click();
    await shoot(page, "09-onboarding-2");
  }

  await browser.close();
  console.log("done");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
