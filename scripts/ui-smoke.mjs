// Headless UI smoke test: loads the app, exercises key flows, captures
// screenshots and console errors. Run against a local dev server:
//   PORT=3941 npm run dev &
//   BASE=http://localhost:3941 node scripts/ui-smoke.mjs
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3941";
const OUT = "/tmp/wsc-ui";
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1024 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console.error: " + m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("shot", name);
};
const clickBtn = (re) => page.getByRole("button", { name: re }).first().click();

const plan = "uismoke" + Date.now().toString().slice(-5);
await page.goto(`${BASE}/?plan=${plan}`, { waitUntil: "networkidle", timeout: 60000 });
await page.getByRole("button", { name: /auto-fill/i }).waitFor({ timeout: 30000 });
await page.waitForTimeout(600);
await shot("01-main");

try {
  await clickBtn(/auto-fill/i);
  await page.waitForTimeout(1600);
  await shot("02-autofill");
} catch (e) {
  errors.push("autofill step: " + e.message);
}

try {
  await clickBtn(/compare & merge/i);
  await page.waitForTimeout(700);
  await shot("03-compare");
  await page.keyboard.press("Escape");
} catch (e) {
  errors.push("compare step: " + e.message);
}

try {
  await clickBtn(/guest list/i);
  await page.waitForTimeout(600);
  await shot("04-guests");
  await page.keyboard.press("Escape");
} catch (e) {
  errors.push("guests step: " + e.message);
}

try {
  await page.getByText(/^T7$/).first().click();
  await page.waitForTimeout(500);
  await shot("05-table-detail");
} catch (e) {
  errors.push("table-detail step: " + e.message);
}

try {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await shot("06-mobile");
} catch (e) {
  errors.push("mobile step: " + e.message);
}

console.log("CONSOLE_ERRORS_COUNT=" + errors.length);
for (const e of errors) console.log("ERR " + e);
await browser.close();
