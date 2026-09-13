import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = `אתה Adigo - עוזר AI ליצירת מודעות שיווקיות לעסקים קטנים בעברית.

המשימה שלך:
1. קבל פרטי עסק וגרסת מבצע/הצעה
2. יצור מודעה מקצועית בעברית טהורה ללא שום טעות כתיב
3. החזר JSON מובנה עם כל הערוצים

חוקים חשובים:
- כל הטקסט חייב להיות עברית מושלמת וללא שום טעויות כתיב
- המודעות חייבות להיות קצרות, מושכות ומעוררות פעולה
- הטון צריך להיות ידידותי אך מקצועי
- הכותרת חייבת לעורר תשומת לב בהן וחנות
- ה-CTA (קריאה לפעולה) חייב להיות ברור וחד-משמעי
- גרסת WhatsApp חייבת להיות קצרה וקלה לשיתוף
- גרסת Instagram חייבת להיות בעלת כיף וחיווי עצמי
- רעיון הווידיאו צריך להיות פשוט וניתן ליישום

תמיד החזר JSON בדיוק בפורמט הזה (בלי Markdown):
{
  "headline": "כותרת מושכת",
  "body": "גוף המודעה",
  "cta": "קריאה לפעולה",
  "whatsapp": "טקסט ל-WhatsApp",
  "instagram": "טקסט עם emojis ל-Instagram",
  "videoIdea": "תיאור ברור של רעיון סרטון"
}`;

export async function generateCampaign(campaignData) {
  const {
    businessName,
    businessCategory,
    targetAudience,
    offerDescription,
    channel = "all",
  } = campaignData;

  const userPrompt = `יוצר עסק: ${businessName}
קטגוריה: ${businessCategory}
קהל יעד: ${targetAudience}
המבצע/ההצעה: ${offerDescription}
ערוץ: ${channel}

אנא צור מודעה בעברית טהורה ללא שום טעות כתיב.`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0].text;

    // ניסיון לחלץ JSON מהתגובה
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude לא החזר JSON תקין");
    }

    const result = JSON.parse(jsonMatch[0]);

    // וידוא שכל השדות קיימים
    return {
      headline: result.headline || "",
      body: result.body || "",
      cta: result.cta || "",
      whatsapp: result.whatsapp || "",
      instagram: result.instagram || "",
      videoIdea: result.videoIdea || "",
    };
  } catch (error) {
    console.error("שגיאה בייצור קמפיין:", error);
    throw new Error(
      `לא הצלחנו ליצור מודעה. בדוק את הנתונים והנסה שנית: ${error.message}`
    );
  }
}
