// Browser test of the dashboard: node tests/browser_test.js [port]
const { chromium } = require("playwright");
const port = process.argv[2] || "8799";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${port}/?t=test-token`);
  const results = [];
  const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); };

  await page.waitForFunction(() => document.querySelector("#chipConn").textContent.includes("מחובר"), null, { timeout: 8000 });
  check("connects to the agent", true);
  check("Hebrew title renders", (await page.textContent("h1")) === "הסוכן שלי");
  check("right-to-left layout", (await page.getAttribute(".wrap", "dir")) === "rtl");
  const has3d = await page.evaluate(() => !!window.THREE && !document.querySelector("#scene").hidden);
  check("3D avatar loaded", has3d);
  const cov = await page.evaluate(() => window.HEBREW.coverage());
  check("speech covers all 27 Hebrew letters", cov.missing.length === 0 && cov.total === 27, JSON.stringify(cov));

  const picked = await page.evaluate(() => [
    pickVoice("he", [{ name: "Microsoft Hila Online (Natural) - Hebrew (Israel)", lang: "he-IL" },
                     { name: "Microsoft Avri Online (Natural) - Hebrew (Israel)", lang: "he-IL" }]).name,
    pickVoice("he", [{ name: "Microsoft Asaf - Hebrew (Israel)", lang: "he-IL" }, { name: "Carmit", lang: "he-IL" }]).name,
  ]);
  check("chooses a male Hebrew voice (Avri / Asaf)", /Avri/.test(picked[0]) && /Asaf/.test(picked[1]), picked.join(", "));
  const noTok = await page.evaluate(async () => (await fetch("/api/state")).status);
  check("API refuses requests without the secret key", noTok === 401, String(noTok));
  await page.fill("#taskInput", "תפתח את המחשבון ותחשב 12*12");
  await page.click("button.send");
  await page.waitForFunction(() => document.querySelector("#tasks").textContent.includes("המחשבון"), null, { timeout: 8000 });
  check("Hebrew task submitted and listed", true);
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes("Task #1"), null, { timeout: 8000 });
  check("agent picked up the task", true);

  await page.click("#wakeBtn");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes("Double clap"), null, { timeout: 8000 });
  check("wake-up (clap) reaches the dashboard", true);

  await page.click("#hebBtn");
  await page.waitForSelector("#hebLetters");
  const letters = await page.$$eval("#hebLetters span", (s) => s.map((x) => x.textContent).join(""));
  check("Hebrew test shows all letters", letters === "אבגדהוזחטיכלמנסעפצקרשתךםןףץ", letters);

  await page.screenshot({ path: process.env.SHOT || "dashboard.png" });
  check("no JavaScript errors", errors.length === 0, errors.join(" | "));
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail && !r.ok ? "  -> " + r.detail : ""}`);
  await browser.close();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("FAIL ", e.message); process.exit(1); });
