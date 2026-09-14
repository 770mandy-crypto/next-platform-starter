import { anthropicClient, hasClaude } from "@/lib/adigo/ai-clients";

const SYSTEM_PROMPT = `אתה עוזר אישי חכם שעונה בעברית.

איך אתה עונה:
- תמיד בעברית תקנית ומדויקת, בכתיב מלא וללא שגיאות, אלא אם ביקשו ממך שפה אחרת.
- ישר לעניין. בלי הקדמות ובלי "שאלה מצוינת". תשובה קצרה עדיפה על ארוכה.
- כשיש צעדים, תן רשימה ממוספרת קצרה.
- כשאתה לא יודע משהו או לא בטוח, תגיד את זה במפורש. אל תמציא עובדות, מספרים, תאריכים, מחירים או מקורות.
- כשהשאלה לא ברורה, שאל שאלה אחת ממוקדת במקום לנחש.

אתה עוזר בכל נושא: כתיבה, ניסוח, תרגום, סיכום, חשבון, לימודים, טכנולוגיה, עסקים, בישול, מכתבים רשמיים ועוד.

אתה מבין היטב את ההקשר הישראלי — עסקים קטנים, רשויות, טפסים, חגים וקבוצות וואטסאפ — והשפה שלך יומיומית וטבעית, לא מתורגמת מאנגלית.`;

export async function POST(request) {
  if (!hasClaude()) {
    return Response.json(
      {
        error:
          "העוזר עדיין לא מחובר למוח. צריך להוסיף את המפתח ANTHROPIC_API_KEY בהגדרות האתר.",
        needsKey: true,
      },
      { status: 503 }
    );
  }

  let messages;
  try {
    const payload = await request.json();
    messages = Array.isArray(payload.messages) ? payload.messages : [];
  } catch {
    return Response.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const clean = messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 20000),
    }))
    .slice(-20);

  if (!clean.length) {
    return Response.json({ error: "אין הודעה לשלוח" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropicClient().messages.stream({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: clean,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (error) {
        console.error("שגיאה בצ'אט:", error);
        controller.enqueue(
          encoder.encode("\n\n⚠️ משהו השתבש באמצע התשובה. נסו לשלוח שוב.")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
