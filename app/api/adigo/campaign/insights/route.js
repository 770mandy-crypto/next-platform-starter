import { anthropicClient, hasClaude } from "@/lib/adigo/ai-clients";

const FALLBACK_INSIGHTS = `✅ נקודות חוזק בקמפיין:
- הכותרת קצרה וברורה
- הקריאה לפעולה חד-משמעית
- הטקסט כתוב בעברית תקנית

💡 הצעות לשיפור:
- הוסיפו מספר או נתון קונקרטי כדי להגביר אמינות
- הדגישו את הערך הייחודי שלכם, לא רק את המחיר
- הוסיפו מסגרת זמן ("עד יום חמישי") כדי ליצור דחיפות

🎯 ערוצים מומלצים:
- וואטסאפ: הכי יעיל לקהל מקומי ולקבוצות שכונה
- אינסטגרם: מתאים כשיש תמונה חזקה
- פייסבוק: הגעה רחבה לקהל מבוגר יותר`;

export async function POST(request) {
  if (!hasClaude()) {
    return Response.json({
      insights: FALLBACK_INSIGHTS,
      mockMode: true,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const payload = await request.json();
    const { headline, body, cta, businessName, businessCategory, targetAudience } = payload;

    const prompt = `אתה מנתח שיווק מומחה. יש לך קמפיין בעברית:

עסק: ${businessName}
קטגוריה: ${businessCategory}
קהל יעד: ${targetAudience}

הטקסטים:
כותרת: ${headline}
גוף: ${body}
CTA: ${cta}

אנא תן 3-5 עצות קצרות וברורות לשיפור הקמפיין:
1. מה טוב בקמפיין הזה?
2. מה יכול להשתפר?
3. איזה סוג קהל כדאי להכוון?
4. איזה ערוץ יהיה הכי יעיל?
5. טיפ אחד נוסף להגברת ההשפעה?

כתוב בעברית, תשובה קצרה ישירה.`;

    const response = await anthropicClient().messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const insights = response.content[0].text;

    return Response.json({
      insights,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("שגיאה בניתוח קמפיין:", error);

    return Response.json({
      insights: FALLBACK_INSIGHTS,
      mockMode: true,
      timestamp: new Date().toISOString(),
    });
  }
}
