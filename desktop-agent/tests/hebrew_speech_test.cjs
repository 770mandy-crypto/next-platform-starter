// Tests how the agent speaks Hebrew: node tests/hebrew_speech_test.cjs (serves the dashboard file directly)
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + path.resolve(__dirname, "../dashboard/index.html"));
  await page.waitForFunction(() => window.speechText && window.STOP_WORDS);
  let fails = 0;
  const ok = (cond, name, detail) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + detail}`); if (!cond) fails++; };

  const speech = [
    ["המחיר הוא ₪120", "המחיר הוא 120 שקלים"],
    ["עלה ב-15%", "עלה ב-15 אחוז"],
    ["שילמתי 1,200 ש\"ח", "שילמתי 1200 שקלים"],
    ["הפגישה בת\"א ברח' הרצל", "הפגישה בתל אביב ברחוב הרצל"],
    ["הבאתי ניירות, עטים וכו'", "הבאתי ניירות, עטים וכולי"],
    ["דברתי עם עו\"ד כהן", "דברתי עם עורך דין כהן"],
    ["זה ייקח 3-5 דק'", "זה ייקח 3 עד 5 דקות"],
    ["**סיימתי!** 🎉", "סיימתי!"],
    ["הקובץ כאן: https://example.com/a/b", "הקובץ כאן: קישור"],
    ["- פתחתי את הדפדפן\n- חיפשתי מזג אוויר", "פתחתי את הדפדפן. חיפשתי מזג אוויר"],
    ["שלחתי ל-dana@gmail.com", "שלחתי ל-dana שטרודל gmail נקודה com"],
    ["טסתי לארה\"ב", "טסתי לארצות הברית"],
  ];
  for (const [input, want] of speech) {
    const got = await page.evaluate((t) => speechText(t), input);
    ok(got === want, `reads aloud: ${input.replace(/\n/g, " / ")}`, `got "${got}"`);
  }

  const stops = ["עצור", "תעצור", "תעצור את זה", "די", "די כבר", "מספיק", "תפסיק בבקשה", "עזוב", "בטל את המשימה", "תבטל הכל", "stop", "רגע", "עצור!"];
  for (const s of stops) ok(await page.evaluate((t) => STOP_WORDS.test(t), s), `understands stop: "${s}"`, "not recognised");
  const notStops = ["תפתח את המחשבון", "די קשה לי עם האקסל, תעזור", "תכין מצגת על עצירת עישון", "מה מזג האוויר"];
  for (const s of notStops) ok(!(await page.evaluate((t) => STOP_WORDS.test(t), s)), `does not mistake for stop: "${s}"`, "wrongly treated as stop");

  const phrases = await page.evaluate(() => SAY);
  const all = Object.values(phrases).flat();
  ok(all.every((p) => /[֐-׿]/.test(p)), "all spoken phrases are Hebrew", all.join(" | "));
  ok(Object.values(phrases).every((l) => l.length >= 2), "phrases vary (not robotic)", JSON.stringify(phrases));
  ok(all.every((p) => (p.match(/ /g) || []).length <= 7), "phrases are short", "");
  const cov = await page.evaluate(() => HEBREW.coverage());
  ok(cov.missing.length === 0, "letter test covers all 27 letters", cov.missing.join(""));

  await browser.close();
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
