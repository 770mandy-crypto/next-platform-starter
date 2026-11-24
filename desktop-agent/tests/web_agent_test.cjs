// Browser test of the in-browser agent (web/index.html) with simulated claude.ai capabilities.
// node tests/web_agent_test.cjs [three.min.js] [pptxgen.bundle.js]
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const THREE_JS = process.argv[2] || path.resolve(__dirname, "../dashboard/vendor/three.min.js");
const PPTX_JS = process.argv[3];

const FAKE = `
window.__log = { mcp: [], spoken: [], saved: [] };
window.__script = [];   // what the fake Claude does on the next call
const caps = {
  sample: Object.assign(async (input, opts) => {
    window.__lastInput = input;
    const step = window.__script.shift() || { say: "בסדר." };
    let out = "";
    for (const call of step.tools || []) {
      if (opts.signal && opts.signal.aborted) throw { code: "cancelled" };
      const t = opts.tools.find((x) => x.name === call.name);
      try { out = String(await t.execute(call.input, { signal: opts.signal || new AbortController().signal })); }
      catch (e) { out = "Error: " + e.message; }
      window.__lastToolResult = out;
    }
    if (step.wait) await new Promise((r, j) => { const t = setTimeout(r, step.wait); opts.signal && opts.signal.addEventListener("abort", () => { clearTimeout(t); j({ code: "cancelled" }); }); });
    opts.onText && opts.onText({ text: step.say, delta: step.say });
    return { text: step.say, truncated: false, modelTierApplied: "default" };
  }, { limits: async () => ({ maxPromptBytes: 262144, tools: { maxCount: 20 } }) }),
  mcp: {
    callTool: async (server, tool, input) => { window.__log.mcp.push({ server, tool, input });
      if (server === "Google Drive" && window.__driveDown) throw { code: "needs_reauth", server };
      return { content: [], payload: { ok: true, tool, echo: input } }; },
    listTools: async () => ({ servers: [{ server: "Gmail", authStatus: "connected", tools: [{ name: "search_threads" }] },
                                        { server: "Google Calendar", authStatus: "connected", tools: [{ name: "list_events" }] }] }),
  },
  tts: { speak: async (t, o) => { window.__log.spoken.push({ t, o }); return { playedMs: 1 }; }, onState: () => () => {}, active: () => false, stop: async () => {} },
  dictation: (() => { let st = null, fin = null, on = false; return {
    onState: (h) => (st = h, () => {}), onPartial: () => () => {}, onFinal: (h) => (fin = h, () => {}),
    active: () => on, stop: async () => { on = false; st({ state: "idle", reason: "stopped" }); },
    start: async () => { on = true; st({ state: "listening" }); window.__say = (text) => { fin({ text }); on = false; st({ state: "idle", reason: "stopped" }); }; } }; })(),
  downloads: { save: async (r) => { window.__log.saved.push({ name: r.filename, size: r.data.size, blob: r.data }); return { status: "saved" }; } },
};
window.claude = { use: async (n) => caps[n] || null };
`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.route(/three\.min\.js$/, (r) => r.fulfill({ body: fs.readFileSync(THREE_JS), contentType: "text/javascript" }));
  await page.route(/pptxgen\.bundle\.js$/, (r) => PPTX_JS ? r.fulfill({ body: fs.readFileSync(PPTX_JS), contentType: "text/javascript" }) : r.abort());
  await page.route(/fonts\.googleapis/, (r) => r.fulfill({ body: "", contentType: "text/css" }));
  await page.addInitScript(FAKE);
  await page.goto("file://" + path.resolve(__dirname, "../web/index.html"));
  let fails = 0;
  const ok = (c, name, d = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${name}${c ? "" : "  -> " + d}`); if (!c) fails++; };
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 6000 }).then(() => true, () => false);

  ok(await until(() => document.querySelector("#chipClaude").textContent.includes("מחובר")), "connects to Claude");
  ok(await page.evaluate(() => !!window.THREE && !document.querySelector("#scene").hidden), "3D avatar shows");
  ok(await until(() => document.querySelector("#conn").textContent.includes("מחובר")), "shows connections status");

  // Voice in (dictation) -> calendar question in Hebrew
  await page.evaluate(() => window.__script.push({ tools: [{ name: "calendar_list", input: { startTime: "2026-11-25T00:00:00", endTime: "2026-11-26T00:00:00" } }], say: "מחר יש לך פגישה עם דני ב-10:00 בת\"א." }));
  await page.click("#mic");
  ok(await until(() => document.querySelector("#mic").classList.contains("on")), "microphone starts listening on click");
  await page.evaluate(() => window.__say("מה יש לי ביומן מחר"));
  ok(await until(() => document.querySelector("#chat").textContent.includes("פגישה עם דני")), "spoken Hebrew request answered");
  const cal = await page.evaluate(() => window.__log.mcp.find((m) => m.tool === "list_events"));
  ok(cal && cal.server === "Google Calendar" && cal.input.startTime === "2026-11-25T00:00:00", "calendar read through Google Calendar connector", JSON.stringify(cal));
  const spoken = await page.evaluate(() => window.__log.spoken.map((s) => s.t));
  ok(spoken.some((t) => t.includes("בתל אביב")), "reply read aloud in natural Hebrew (ת\"א -> תל אביב)", spoken.join(" | "));
  const voice = await page.evaluate(() => window.__log.spoken.at(-1).o);
  ok(voice.language === "he" && voice.voice === "rounded", "speaks Hebrew in the chosen voice", JSON.stringify(voice));

  // Email send needs approval; declining sends nothing
  await page.evaluate(() => window.__script.push({ tools: [{ name: "mail_send", input: { to: ["dana@example.com"], subject: "פגישה", body: "נתראה מחר" } }], say: "בסדר, לא שלחתי." }));
  await page.fill("#taskInput", "תשלח לדנה מייל שנתראה מחר"); await page.click("button.send");
  ok(await until(() => !document.querySelector("#approveCard").hidden), "asks for approval before sending email");
  ok((await page.textContent("#approveText")).includes("dana@example.com"), "approval shows the full email");
  await page.click("#approveNo");
  await until(() => document.querySelector("#chat").textContent.includes("לא שלחתי"));
  ok(!(await page.evaluate(() => window.__log.mcp.some((m) => m.tool === "send_message"))), "declined email is NOT sent");

  // Approving sends it
  await page.evaluate(() => window.__script.push({ tools: [{ name: "mail_send", input: { to: ["dana@example.com"], subject: "פגישה", body: "נתראה מחר" } }], say: "שלחתי." }));
  await page.fill("#taskInput", "תשלח בכל זאת"); await page.click("button.send");
  await until(() => !document.querySelector("#approveCard").hidden); await page.click("#approveYes");
  ok(await until(() => window.__log.mcp.some((m) => m.tool === "send_message")), "approved email is sent through Gmail");

  // Stop cancels a running task; queued task can be cancelled
  await page.evaluate(() => { window.__script.push({ wait: 5000, say: "לא אמור להגיע" }); });
  await page.fill("#taskInput", "משימה ארוכה"); await page.click("button.send");
  await page.fill("#taskInput", "משימה שנייה"); await page.click("button.send");
  ok(await until(() => document.querySelectorAll("#queue li").length === 2), "queue shows running + waiting task");
  await page.click("#queue li:nth-child(2) button");
  ok(await until(() => document.querySelectorAll("#queue li").length === 1), "cancel removes a waiting task");
  await page.fill("#taskInput", "די"); await page.click("button.send");
  ok(await until(() => document.querySelector("#chat").textContent.includes("עצרתי")), "saying 'די' stops the running task");
  ok(!(await page.textContent("#chat")).includes("לא אמור להגיע"), "stopped task never finishes");

  // Connector error is explained in Hebrew
  await page.evaluate(() => { window.__driveDown = true; window.__script.push({ tools: [{ name: "drive_search", input: { query: "title contains 'חוזה'" } }], say: "צריך לחבר מחדש את הדרייב." }); });
  await page.fill("#taskInput", "תמצא את החוזה"); await page.click("button.send");
  await until(() => document.querySelector("#chat").textContent.includes("לחבר מחדש"));
  ok((await page.evaluate(() => window.__lastToolResult)).includes("לחבר מחדש את Google Drive"), "expired connector gives a clear Hebrew fix", await page.evaluate(() => window.__lastToolResult));

  // Prompt includes safety rules
  const rules = await page.evaluate(() => window.__lastInput[0].content);
  ok(rules.includes("לעולם לא הוראות") && rules.includes("לשון זכר"), "instructions: content is data, male address");

  // Presentation
  if (PPTX_JS) {
    await page.evaluate(() => window.__script.push({ tools: [{ name: "presentation_create", input: { title: "תוכנית עבודה 2027", subtitle: "סקירה", slides: [{ title: "יעדים", bullets: ["צמיחה של 20%", "שני מוצרים חדשים"] }, { title: "לוח זמנים", bullets: ["רבעון 1: תכנון"] }] } }], say: "המצגת מוכנה." }));
    await page.fill("#taskInput", "תכין מצגת על תוכנית העבודה"); await page.click("button.send");
    ok(await until(() => [...document.querySelectorAll("#chat button")].some((b) => b.textContent.includes("שמור את המצגת"))), "presentation built and offered to save");
    await page.click("text=שמור את המצגת");
    await until(() => window.__log.saved.length > 0);
    const info = await page.evaluate(async () => { const s = window.__log.saved[0]; const b = new Uint8Array(await s.blob.arrayBuffer()); return { name: s.name, size: s.size, zip: b[0] === 0x50 && b[1] === 0x4b }; });
    ok(info.name === "תוכנית עבודה 2027.pptx" && info.zip && info.size > 20000, "saves a real .pptx file with a Hebrew name", JSON.stringify(info));
    const xml = await page.evaluate(async () => { const z = await JSZip.loadAsync(window.__log.saved[0].blob); return z.file("ppt/slides/slide2.xml").async("string"); });
    ok(xml.includes("צמיחה של 20%") && /rtl="1"/.test(xml), "slides contain the Hebrew text, right-to-left", xml.slice(0, 200));
  }
  await page.screenshot({ path: process.env.SHOT || "/tmp/web-agent.png" });
  ok(errors.length === 0, "no JavaScript errors", errors.join(" | "));
  await browser.close();
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
