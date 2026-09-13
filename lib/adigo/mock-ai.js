export async function generateCampaignMock(campaignData) {
  const { businessName, businessCategory, targetAudience, offerDescription } =
    campaignData;

  // חיכוי כדי לחקות את זמן העיבוד
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // תמונת אצבע לפי שדות הנתונים
  const seed = (businessName + offerDescription).length % 5;

  // 5 דוגמאות שונות בעברית טהורה
  const templates = [
    {
      headline: `🔥 ${businessName} - הדיל שחיכיתם לו!`,
      body: `מידע נוסף: ${offerDescription}\n\nתופסים הנחה עכשיו! זה ההצעה שלך להיום בלבד. לא משנה אם אתה חדש או קבוע, הכל כולל ב-${businessName}.`,
      cta: "יצא לקנות עכשיו 🛍️",
      whatsapp: `הי! ראיתי ב-${businessName} את הדיל המשוגע הזה: ${offerDescription}. בואו נהיה ביחד? 😊`,
      instagram: `✨ חדשות טובות מ-${businessName}! 🎉\n${offerDescription}\n\nזה בדיוק מה שחיכינו לו! 🚀\n#${businessName.replace(/\s+/g, "")}#עסקים_טובים`,
      videoIdea: `סרטון TikTok: הראה מוקדע על ${offerDescription}. עשר שניות - תחזוק את הטלפון וצילום מהמקום. סוף: לוגו ${businessName}`,
    },
    {
      headline: `⚡ זה קרה בסוף! ${businessName} משחרר הנחה גדולה`,
      body: `רק בשביל אנשים בעיר שלנו!\n\n${offerDescription}\n\nלא יודע עדיין? ${businessName} הוא המקום הכי טוב לאיכות + מחיר. בואו נדוג פה!`,
      cta: "אנא עכשיו - מוגבל! ⏰",
      whatsapp: `עבור-מהמיי! ${businessName} עשה משהו אלוהי: ${offerDescription}. יצא עכשיו? 🙌`,
      instagram: `😍 ${businessName} שמע לנו!\n\n${offerDescription}\n\nנו, מה אתה מחכה? 🎊\n\n#חדשות_טובות #${businessName.replace(/\s+/g, "")}`,
      videoIdea: `וידיאו Reel: סצנה של אנשים שמגיעים ל-${businessName}. מופתע - "יש לכם הנחה?" כן! ${offerDescription} 🎬`,
    },
    {
      headline: `🎯 ${businessName} מתנה לך הנחה מיוחדת`,
      body: `קהל יעד: ${targetAudience}\n\nהנחה: ${offerDescription}\n\n${businessName} מאמין שכל אחד שלנו ראוי לאיכות וגם למחיר טוב. בואו נוכיח זאת ביחד!`,
      cta: "בואו לקבל הנחה 🎁",
      whatsapp: `${businessName} אומר לך: ${offerDescription}! מגיע לך הזה. בואו? 💪`,
      instagram: `🌟 ${businessName} חוגג!\n\n${offerDescription}\n\nקהל יעד: ${targetAudience.slice(0, 40)}...\n\n#משוגע #עד_היום_בלבד`,
      videoIdea: `סרטון מהיר: עצמאי מדברים ישירות לעדשה. "ב-${businessName} קיבלתי ${offerDescription}!" מיד - לוגו הסוף.`,
    },
    {
      headline: `🚀 הנחה פרוצה ב-${businessName}!`,
      body: `${offerDescription}\n\nאנחנו לא מתחמקים - זה בדיוק מה שקרא עכשיו בחנות שלנו! בואו תהיו חלק מהקהל החזק שלנו.`,
      cta: "יצא בחינם עכשיו 🏃",
      whatsapp: `${businessName} בקול עליון: ${offerDescription}. אתה? 🎯`,
      instagram: `💥 ${businessName} פוצץ הנחות!\n${offerDescription}\n\nנשמעת טוב? בואו! 🔥\n#הנחות_טובות`,
      videoIdea: `סרטון Shorts: אדם חוזר מ-${businessName} עם הקניות שלו. ספוטלייט על ההנחה. קול: "${offerDescription}" 📹`,
    },
    {
      headline: `💝 ${businessName} אוהב אתכם - הנחה בלעדית`,
      body: `אנחנו חייבים להודות: ${targetAudience} זה סיבה לחגוג!\n\n${offerDescription}\n\nתודה שבחרתם בנו. בואו נשמור על הקשר הזה.`,
      cta: "תודה! רוצה הנחה? ✨",
      whatsapp: `ממש אישי: ${businessName} חשבה עליך. ב-${offerDescription}! בואו נראה אותך בקרוב? 👋`,
      instagram: `🎉 יום מיוחד ב-${businessName}!\n${offerDescription}\n\nלמי? לכל אחד שמעריך איכות וטובות! 🙏\n#הודיה`,
      videoIdea: `סרטון ערך: אדם מדבר למצלמה "למה אני בוחר ב-${businessName}"? סיבות שלוש. הסוף: ${offerDescription}`,
    },
  ];

  const template = templates[seed];

  return {
    ...template,
    id: `campaign_${Date.now()}`,
    createdAt: new Date().toISOString(),
    businessName,
    businessCategory,
    offerDescription,
  };
}
