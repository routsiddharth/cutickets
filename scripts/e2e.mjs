import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const shots = [];
const errors = [];

async function snap(page, name) {
  const path = `design-demos/e2e-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  shots.push(name);
  console.log("📸", name);
}

const browser = await chromium.launch();

async function loginAs(email, name) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${email}] ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[console ${email}] ${m.text()}`);
  });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const devToggle = page.getByText("Dev login (local testing", { exact: false });
  await devToggle.click();
  await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 10000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="text"]').fill(name);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/") || u.pathname === "/events" || u.pathname === "/onboarding", { timeout: 15000 }).catch(() => {}),
    page.getByRole("button", { name: /Enter the board/i }).click(),
  ]);
  // Wait until we've actually left the landing page.
  await page.waitForFunction(() => !document.body.innerText.includes("The board for"), { timeout: 15000 });
  return { ctx, page };
}

// Unique each run so the "new user → onboarding" path is always exercised.
const NEWBIE = `newbie.${Date.now()}@columbia.edu`;

try {
  // ── 1. New user → onboarding ──────────────────────────────────────────────
  const { page: p1 } = await loginAs(NEWBIE, "Sam Rivera");
  await p1.waitForURL(/\/onboarding/, { timeout: 10000 });
  await snap(p1, "01-onboarding");
  await p1.selectOption("#school", "Columbia College");
  await p1.selectOption("#classYear", String(new Date().getFullYear() + 2));
  await p1.getByRole("button", { name: /Continue to the board/i }).click();
  await p1.waitForURL(/\/events/, { timeout: 10000 });
  await snap(p1, "02-events");

  // ── 2. Event mini-market ──────────────────────────────────────────────────
  await p1.getByRole("link", { name: /Bacchanal Spring Concert/ }).first().click();
  await p1.waitForURL(/\/events\/.+/, { timeout: 10000 });
  await p1.getByText("Selling", { exact: true }).waitFor();
  await snap(p1, "03-event-market");

  // ── 3. Express interest on Jordan's $35 SELL listing ──────────────────────
  const jordanCard = p1.locator("div", { hasText: "Jordan M." }).filter({ hasText: "$35" }).last();
  await jordanCard.getByRole("button", { name: "I'm interested" }).click();
  await p1.getByText("Reached out ✓").first().waitFor({ timeout: 10000 });
  await snap(p1, "04-after-interest");

  // ── 4. Post a brand-new listing ───────────────────────────────────────────
  await p1.goto(`${BASE}/listings/new`, { waitUntil: "domcontentloaded" });
  await p1.selectOption("#eventId", { label: "CU Records × 1020 Night" });
  await p1.fill("#quantity", "2");
  await p1.fill("#price", "25");
  await p1.getByRole("button", { name: /Post to the board/i }).click();
  await p1.waitForURL(/\/events\/.+/, { timeout: 10000 });
  await snap(p1, "05-posted-listing");

  // ── 5. Jordan accepts the request ─────────────────────────────────────────
  const { page: pJ } = await loginAs("jordan@columbia.edu", "Jordan Martinez");
  await pJ.goto(`${BASE}/matches`, { waitUntil: "domcontentloaded" });
  await pJ.getByRole("button", { name: /Accept & share email/i }).first().waitFor({ timeout: 10000 });
  await snap(pJ, "06-jordan-matches");
  await pJ.getByRole("button", { name: /Accept & share email/i }).first().click();
  await pJ.getByText(NEWBIE).first().waitFor({ timeout: 10000 });
  await snap(pJ, "07-jordan-accepted");
  await pJ.getByRole("button", { name: /Mark trade complete/i }).first().click();
  await pJ.getByText(/You confirmed/).first().waitFor({ timeout: 10000 });
  await snap(pJ, "08-jordan-confirmed");

  // ── 6. Newbie confirms + rates ────────────────────────────────────────────
  await p1.goto(`${BASE}/matches`, { waitUntil: "domcontentloaded" });
  await p1.getByRole("button", { name: /Mark trade complete/i }).first().waitFor({ timeout: 10000 });
  await snap(p1, "09-newbie-matches");
  await p1.getByRole("button", { name: /Mark trade complete/i }).first().click();
  await p1.getByRole("button", { name: /^Rate$/ }).first().waitFor({ timeout: 10000 });
  await snap(p1, "10-newbie-completed");
  await p1.getByRole("button", { name: /^Rate$/ }).first().click();
  await p1.getByText(/rating saved/).first().waitFor({ timeout: 10000 });
  await snap(p1, "11-newbie-rated");

  // ── 7. Profile + report (reach Jordan via the matches list) ───────────────
  await p1.goto(`${BASE}/matches`, { waitUntil: "domcontentloaded" });
  await p1.getByRole("link", { name: "Jordan M." }).first().click();
  await p1.waitForURL(/\/profile\/.+/, { timeout: 10000 });
  await p1.getByText("Confirmed trades").waitFor();
  await snap(p1, "12-profile");
  await p1.getByRole("button", { name: /Report user/i }).click();
  await snap(p1, "13-report-open");

  // ── 8. Domain rejection: non-campus email must be refused ─────────────────
  const ctx = await browser.newContext();
  const pBad = await ctx.newPage();
  await pBad.goto(BASE, { waitUntil: "networkidle" });
  await pBad.getByText("Dev login (local testing", { exact: false }).click();
  await pBad.locator('input[type="email"]').waitFor({ state: "visible", timeout: 10000 });
  await pBad.locator('input[type="email"]').fill("intruder@gmail.com");
  await pBad.locator('input[type="text"]').fill("Not A Student");
  await pBad.getByRole("button", { name: /Enter the board/i }).click();
  await pBad.getByText(/must end in/i).waitFor({ timeout: 10000 });
  await snap(pBad, "14-domain-rejected");
} catch (e) {
  console.error("E2E ERROR:", e.message);
  errors.push("FLOW: " + e.message);
} finally {
  await browser.close();
}

console.log("\n=== ERRORS ===");
console.log(errors.length ? errors.join("\n") : "none");
console.log("Screens captured:", shots.length);
process.exit(errors.length ? 1 : 0);
