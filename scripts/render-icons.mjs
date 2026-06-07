// Renders the Attent PWA app icons from the supplied brand mark
// (public/images/attent-mark.png — the terracotta circle with the serif "A"),
// composited on a Signature Navy tile. Run: node scripts/render-icons.mjs
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const NAVY = "#0F2740";

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(here, "../public/icons");
const appDir = resolve(here, "../src/app");
mkdirSync(iconsDir, { recursive: true });

// Inline the mark as a data URI so rendering doesn't depend on a running server.
const markDataUri =
  "data:image/png;base64," +
  readFileSync(resolve(here, "../public/images/attent-mark.png")).toString("base64");

/**
 * markPct = circle diameter as % of the tile. Smaller for maskable so the mark
 * stays inside the OS safe zone. `bg` transparent for the notification badge.
 */
function html({ size, markPct, bg }) {
  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0}
    #i{width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center}
    #i img{width:${markPct}%;height:${markPct}%;border-radius:50%;object-fit:cover}
  </style></head><body><div id="i"><img src="${markDataUri}"/></div></body></html>`;
}

const targets = [
  // PWA install icons (referenced by manifest.webmanifest)
  { path: resolve(iconsDir, "icon-192.png"), size: 192, markPct: 78, bg: NAVY },
  { path: resolve(iconsDir, "icon-512.png"), size: 512, markPct: 78, bg: NAVY },
  { path: resolve(iconsDir, "icon-maskable-512.png"), size: 512, markPct: 60, bg: NAVY },
  { path: resolve(iconsDir, "badge-72.png"), size: 72, markPct: 100, bg: "transparent" },
  // Browser favicon + Apple touch icon (Next.js app-icon file conventions).
  // The favicon is the bare circle on transparent so it reads at tab size.
  { path: resolve(appDir, "icon.png"), size: 256, markPct: 100, bg: "transparent" },
  { path: resolve(appDir, "apple-icon.png"), size: 180, markPct: 78, bg: NAVY },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setContent(html(t), { waitUntil: "networkidle" });
  await page.waitForTimeout(100);
  const el = await page.$("#i");
  await el.screenshot({ path: t.path, omitBackground: t.bg === "transparent" });
  console.log("rendered", t.path.split("/").slice(-2).join("/"));
}
await browser.close();
