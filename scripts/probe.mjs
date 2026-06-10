import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const ctx = await b.newContext();
const page = await ctx.newPage();
const msgs = [];
page.on("console", (m) => { if (m.type()==="error") msgs.push(m.text()); });
page.on("pageerror", (e) => msgs.push("PAGEERROR "+e.message));
// login seeded jordan (onboarded)
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Dev login (local testing", { exact:false }).click();
await page.locator('input[type="email"]').waitFor({state:"visible"});
await page.locator('input[type="email"]').fill("jordan@columbia.edu");
await page.locator('input[type="text"]').fill("Jordan Martinez");
await page.getByRole("button",{name:/Enter the board/i}).click();
await page.waitForURL(/\/events/,{timeout:15000});
for (const path of ["/events","/listings/new","/matches"]) {
  msgs.length = 0;
  await page.goto(BASE+path, { waitUntil:"networkidle" });
  await page.waitForTimeout(800);
  console.log(`\n### ${path}: ${msgs.length} errors`);
  msgs.forEach(m=>console.log(m.slice(0,400)));
}
// event page
msgs.length=0;
await page.goto(BASE+"/events",{waitUntil:"networkidle"});
await page.getByRole("link",{name:/Bacchanal/}).first().click();
await page.waitForURL(/\/events\/.+/);
await page.waitForTimeout(800);
console.log(`\n### /events/[id]: ${msgs.length} errors`);
msgs.forEach(m=>console.log(m.slice(0,600)));
await b.close();
