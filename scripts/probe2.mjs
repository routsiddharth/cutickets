import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
// 1. landing (logged out)
{
  const ctx = await b.newContext(); const page = await ctx.newPage();
  const msgs=[]; page.on("console",m=>{if(m.type()==="error")msgs.push(m.text())});
  page.on("pageerror",e=>msgs.push("PAGEERR "+e.message));
  await page.goto(BASE,{waitUntil:"networkidle"}); await page.waitForTimeout(800);
  console.log(`### landing: ${msgs.length}`); msgs.forEach(m=>console.log(m.slice(0,700)));
}
// 2. onboarding (fresh user)
{
  const ctx = await b.newContext(); const page = await ctx.newPage();
  const msgs=[]; page.on("console",m=>{if(m.type()==="error")msgs.push(m.text())});
  page.on("pageerror",e=>msgs.push("PAGEERR "+e.message));
  await page.goto(BASE,{waitUntil:"networkidle"});
  await page.getByText("Dev login (local testing",{exact:false}).click();
  await page.locator('input[type="email"]').waitFor({state:"visible"});
  await page.locator('input[type="email"]').fill(`probe.${Date.now()}@columbia.edu`);
  await page.locator('input[type="text"]').fill("Probe User");
  await page.getByRole("button",{name:/Enter the board/i}).click();
  await page.waitForURL(/\/onboarding/,{timeout:15000});
  await page.waitForTimeout(1000);
  console.log(`### onboarding: ${msgs.length}`); msgs.forEach(m=>console.log(m.slice(0,700)));
}
await b.close();
