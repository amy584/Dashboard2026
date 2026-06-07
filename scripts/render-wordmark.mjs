// Renders the Attent wordmark ("Attent." with terracotta period) to PNG on a
// transparent background. Run: node scripts/render-wordmark.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TERRACOTTA = "#C96E4B";
const NAVY = "#0F2740";
const CREAM = "#F2ECE4";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../public/images");
mkdirSync(outDir, { recursive: true });

function html(color) {
  return `<!doctype html><html><head>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet">
    <style>
      html,body{margin:0;padding:0;background:transparent}
      #w{display:inline-block;padding:40px 56px;font-family:'Playfair Display',Georgia,serif;
         font-weight:500;font-size:240px;line-height:1;color:${color};white-space:nowrap}
      .dot{color:${TERRACOTTA}}
    </style></head>
    <body><div id="w">Attent<span class="dot">.</span></div></body></html>`;
}

const targets = [
  { name: "attent-wordmark-navy.png", color: NAVY },
  { name: "attent-wordmark-cream.png", color: CREAM },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 3 });
for (const t of targets) {
  await page.setContent(html(t.color), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const el = await page.$("#w");
  await el.screenshot({ path: resolve(outDir, t.name), omitBackground: true });
  console.log("rendered", t.name);
}
await browser.close();
