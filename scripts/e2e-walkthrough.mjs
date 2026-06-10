// Dev-only browser walkthrough of the redesigned flow. Requires the dev server
// on :3111 and a phone-verified seeded user (riya@columbia.edu).
import { chromium } from "playwright";

const BASE = "http://localhost:3112";
const shot = (page, name) => page.screenshot({ path: `/tmp/cu-${name}.png`, fullPage: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
const log = [];
page.on("pageerror", (e) => log.push(`PAGEERROR: ${e.message}`));

try {
  // ── sign in via dev login ──
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByText("Dev login (local testing", { exact: false }).click();
  await page.locator('input[type="email"]').fill("riya@columbia.edu");
  await page.locator('input[type="text"]').fill("Riya Lin");
  await page.getByRole("button", { name: /Enter the board/i }).click();
  await page.waitForURL(/\/events/, { timeout: 15000 });
  await shot(page, "1-events");
  log.push(`events page: ${page.url()}`);

  // ── open the Bacchanal event ──
  await page.getByText("Bacchanal Spring Concert", { exact: false }).first().click();
  await page.waitForURL(/\/events\/.+/, { timeout: 10000 });
  await shot(page, "2-event");
  const eventUrl = page.url();
  log.push(`event page: ${eventUrl}`);
  log.push(`has 'Buy a ticket': ${await page.getByText("Buy a ticket").isVisible()}`);
  log.push(`has 'selling around': ${await page.getByText("selling around", { exact: false }).first().isVisible()}`);

  // ── place a buy order that crosses the cheapest ask ($35) ──
  await page.getByRole("link", { name: /Start buying/i }).click();
  await page.waitForURL(/\/order/, { timeout: 10000 });
  await shot(page, "3-order-form");
  await page.locator('input[name="price"]').fill("45"); // crosses the $35 ask
  await page.getByRole("button", { name: /Place buy order/i }).click();
  await page.waitForURL(/\/matches/, { timeout: 15000 });
  await shot(page, "4-matches");
  log.push(`after order: ${page.url()}`);
  log.push(`'Matches to confirm' visible: ${await page.getByText("Matches to confirm").isVisible()}`);

  // ── confirm the match (stage-1 accept) ──
  const confirmBtn = page.getByRole("button", { name: /^Confirm match$/ }).first();
  log.push(`'Confirm match' button present: ${await confirmBtn.count()}`);
  await confirmBtn.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  const confirmedText = await page.getByText(/You confirmed/i).first().isVisible().catch(() => false);
  log.push(`after accept, shows 'You confirmed · waiting on them': ${confirmedText}`);
  await shot(page, "5-accepted");

  await browser.close();
  console.log(JSON.stringify({ ok: log.filter((l)=>l.startsWith("PAGEERROR")).length === 0, log }, null, 2));
} catch (e) {
  log.push(`THREW: ${e.message}`);
  await shot(page, "error").catch(() => {});
  await browser.close();
  console.log(JSON.stringify({ ok: false, log }, null, 2));
  process.exitCode = 1;
}
