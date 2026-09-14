import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { headline, body, cta, businessName, businessCategory, targetAudience } = body;

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

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
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

    // Return mock insights if API fails
    const mockInsights = `✅ נקודות חוזק בקמפיין:
- הכותרת קצרה וממושכת
- ה-CTA ברור וחד-משמעי
- הטקסט בעברית מושלמת

💡 הצעות לשיפור:
- הוסף מספרים או סטטיסטיקות להעלאת משקעות
- הדגש את הערך הייחודי של המוצר
- תן דחיפות (הצעה מוגבלת בזמן)

🎯 ערוץים מומלצים:
- WhatsApp: טוב לקהל אישי
- Instagram: טוב לתמונות ויזואליות
- Facebook: טוב להגעה רחבה`;

    return Response.json({
      insights: mockInsights,
      mockMode: true,
      timestamp: new Date().toISOString(),
    });
  }
}
