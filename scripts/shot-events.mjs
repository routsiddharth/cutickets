import { chromium } from "playwright";
const BASE = "http://localhost:3113";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
await p.getByText("Dev login (local testing", { exact: false }).click();
await p.locator('input[type="email"]').fill("riya@columbia.edu");
await p.locator('input[type="text"]').fill("Riya Lin");
await p.getByRole("button", { name: /Enter the board/i }).click();
await p.waitForURL(/\/events/, { timeout: 15000 });
for (const name of ["Bacchanal Spring Concert", "Barnard Spring Formal"]) {
  await p.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await p.getByText(name, { exact: false }).first().click();
  await p.waitForURL(/\/events\/.+/, { timeout: 10000 });
  await p.waitForTimeout(400);
  const slug = name.split(" ")[0].toLowerCase();
  await p.screenshot({ path: `/tmp/ev-${slug}.png`, fullPage: true });
}
await b.close();
console.log("done");
