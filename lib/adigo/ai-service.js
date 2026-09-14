import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = `אתה Adigo Pro - עוזר AI ברמה גבוהה ליצירת מודעות שיווקיות בעברית בעלות השפעה מקסימלית.

אתה מומחה בשיווק דיגיטלי, פסיכולוגיה צרכנית וכתיבה משכנעת בעברית.

המשימה שלך:
1. קבל פרטי עסק וגרסת מבצע/הצעה
2. יצור מודעות מקצועיות בעברית טהורה ללא שום טעות כתיב
3. החזר JSON מובנה עם כל הערוצים

חוקים למומחים:
- כל הטקסט חייב להיות עברית מושלמת וללא שום טעויות כתיב
- המודעות חייבות להיות קצרות, מושכות ומעוררות פעולה מיידית
- הטון צריך להיות ידידותי אך מקצועי ובעל סמכות
- הכותרת חייבת לעורר תשומת לב בהן וחנות - השתמש במספרים, שאלות או סטייטמנטים חזקים
- ה-CTA (קריאה לפעולה) חייב להיות ברור, חד-משמעי ודחוף
- גרסת WhatsApp חייבת להיות קצרה, בנעימה אישית וקלה לשיתוף בקבוצות
- גרסת Instagram חייבת להיות בעלת כיף, חיווי עצמי וemojis רלוונטיים
- רעיון הווידיאו צריך להיות פשוט, ויזואלי וניתן ליישום ב-15-30 שניות

טיפים לכתיבה משכנעת:
- התחל עם הבעיה של הלקוח, אחרי כך הפתרון שלך
- השתמש בפעלים פעיליים
- צור דחיפות (זמן מוגבל, כמות מוגבלת, וכו')
- הדגש ערך, לא מחיר

תמיד החזר JSON בדיוק בפורמט הזה (בלי Markdown):
{
  "headline": "כותרת מושכת וברורה",
  "body": "גוף המודעה עם ערך ברור",
  "cta": "קריאה לפעולה דחופה וברורה",
  "whatsapp": "טקסט אישי וקצר ל-WhatsApp",
  "instagram": "טקסט עם emojis כיף ל-Instagram",
  "videoIdea": "תיאור ברור של רעיון סרטון פשוט"
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

אנא צור מודעה בעברית טהורה ללא שום טעות כתיב בעלת השפעה מקסימלית.`;

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

export async function generateCampaignVariations(campaignData) {
  const {
    businessName,
    businessCategory,
    targetAudience,
    offerDescription,
  } = campaignData;

  const userPrompt = `יוצר עסק: ${businessName}
קטגוריה: ${businessCategory}
קהל יעד: ${targetAudience}
המבצע/ההצעה: ${offerDescription}

צור 3 גרסאות שונות לחלוטין של מודעות בעברית. כל גרסה צריכה להיות בגישה שונה:
1. גרסה 1 - גישה דחופה ודרמטית
2. גרסה 2 - גישה הומוריסטית וידידותית
3. גרסה 3 - גישה מקצועית וממומחים

החזר מערך JSON:
[
  { "headline": "...", "body": "...", "cta": "...", "whatsapp": "...", "instagram": "...", "videoIdea": "..." },
  { "headline": "...", "body": "...", "cta": "...", "whatsapp": "...", "instagram": "...", "videoIdea": "..." },
  { "headline": "...", "body": "...", "cta": "...", "whatsapp": "...", "instagram": "...", "videoIdea": "..." }
]`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error("Claude לא החזר מערך JSON תקין");
    }

    const variations = JSON.parse(jsonMatch[0]);

    return variations.map(v => ({
      headline: v.headline || "",
      body: v.body || "",
      cta: v.cta || "",
      whatsapp: v.whatsapp || "",
      instagram: v.instagram || "",
      videoIdea: v.videoIdea || "",
    }));
  } catch (error) {
    console.error("שגיאה בייצור גרסאות:", error);
    throw new Error(`לא הצלחנו ליצור גרסאות. נסה שנית: ${error.message}`);
  }
}
