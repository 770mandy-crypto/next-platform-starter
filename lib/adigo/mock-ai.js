export async function generateCampaignMock(campaignData) {
  const { businessName, businessCategory, targetAudience, offerDescription } =
    campaignData;

  // חיכוי כדי לחקות את זמן העיבוד
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // בחר טמפלט לפי קטגוריה
  const categoryTemplates = {
    "קפה וקולחות": [
      {
        headline: `☕ ${businessName} - קפה טעים בהנחה שלא תאמינו!`,
        body: `תשתו קפה טוב עם טעם ומחיר סביר?\n\n${offerDescription}\n\nבאנו להוכיח שאיכות לא צריכה להיות יקרה. בואו להנות!`,
        cta: "בואו לקפה ☕",
        whatsapp: `${businessName} קוראה לך: ${offerDescription} ☕ בואו נתפגש? 😊`,
        instagram: `☕✨ ${businessName}\n\n${offerDescription}\n\nכי אתה ראוי לקפה הטוב ביותר! 🫶\n#קפה_טוב #טעים`,
        videoIdea: `סרטון: הכנת קפה בתיאור, כניסת לקוח, הנחה מופתעת, חיוך מתאים. סוף: לוגו.`,
      },
      {
        headline: `🍰 ${businessName} הם קוראים - הנחה עכשיו!`,
        body: `${offerDescription}\n\nלא סתם קפה - זה חווית ${businessName}. כל כוס, כל פרוסת עוגה, כל רגע ספציאלי.`,
        cta: "טעם עכשיו 🤤",
        whatsapp: `${businessName} בשמחה: ${offerDescription}. אתה בא? ☕🍰`,
        instagram: `😋 ${businessName}!\n${offerDescription}\n\nאתה לא יוכל להתנגד! 💛\n#קפה #עוגה`,
        videoIdea: `Reel: טיים-לפס של קפה מוכן, עוגה על הצלחת, צילום הנחה. סוף: "מחכה לך ב-${businessName}"`,
      },
    ],
    "רסטוראן": [
      {
        headline: `🍽️ ${businessName} - ארוחה שלא תשכחו!`,
        body: `${offerDescription}\n\n${targetAudience} - זה בשביל אתכם!\n\nכל מנה מוכנה עם אהבה, כל חוויה בשביל לשמור עליה.`,
        cta: "הזמינו עכשיו 🍴",
        whatsapp: `${businessName} מזמינה אותך לארוחה: ${offerDescription}. כמה מקום לך? 🍽️`,
        instagram: `🍽️✨ ${businessName}\n\n${offerDescription}\n\nאתה רעב? אנחנו מוכנים! 🔥\n#טעים #רסטוראן`,
        videoIdea: `סרטון מהנה: הכנת מנה מזורה, סגנון עיצוב גבוה, אכילה משכנעת, הנחה. סוף: שם המקום.`,
      },
    ],
    "חנות בגדים": [
      {
        headline: `👗 ${businessName} - סגנון בהנחה!`,
        body: `${offerDescription}\n\nלכל אחד - בגדים שמעניקים ביטחון וסגנון.\n${targetAudience} - זה חיכה לך!`,
        cta: "קנה עכשיו 🛍️",
        whatsapp: `${businessName} בסגנון: ${offerDescription}. בואי לטלטל? 👗✨`,
        instagram: `✨👗 ${businessName}\n\n${offerDescription}\n\nזה בדיוק החולצה שחיפשת! 💚\n#ממש #סגנון`,
        videoIdea: `סרטון: מוצר על דוגמנית, סבב 360, סגנון מעוניין, הנחה ניכרת.`,
      },
    ],
    "יופי ותיקוני": [
      {
        headline: `✨ ${businessName} - ליופי שלך!`,
        body: `${offerDescription}\n\nכולנו ראוים לעצמנו. בואו נדאג לכך ביחד.\n${businessName} - היופי שלך מתחיל כאן.`,
        cta: "בואי להתפנק ✨",
        whatsapp: `${businessName} רוצה לטפל בך: ${offerDescription}. מחכה? 💅`,
        instagram: `💄✨ ${businessName}\n\n${offerDescription}\n\nאתה מעריך? אנחנו מפגינות! 🫶\n#יופי #אהבה_עצמית`,
        videoIdea: `סרטון: לפני/אחרי, מומחה מדברת, טרנספורמציה, הנחה מוצעת.`,
      },
    ],
    "פיטנס": [
      {
        headline: `💪 ${businessName} - כח בהנחה!`,
        body: `${offerDescription}\n\n${targetAudience} - בואו נהיה חזקים ביחד!\n${businessName} את לא רק מקום - זה משפחה.`,
        cta: "התחל עכשיו 🏋️",
        whatsapp: `${businessName} קוראה: ${offerDescription}. בואו נתרגלו? 💪`,
        instagram: `💪🔥 ${businessName}\n\n${offerDescription}\n\nהזמן שלך! עוד לא מאוחר! 🚀\n#פיטנס #כוח`,
        videoIdea: `סרטון: אימון עוצמתי, אנרגיה גבוהה, הנחה מפתיעה, השראה.`,
      },
    ],
    "הוראה": [
      {
        headline: `📚 ${businessName} - הדרך לחוכמה!`,
        body: `${offerDescription}\n\n${targetAudience} - בואו נגדל ביחד.\n${businessName} - כדי שתוכל להיות הגרסה הטובה ביותר שלך.`,
        cta: "התחל ללמוד 🎓",
        whatsapp: `${businessName} בעניין: ${offerDescription}. מעוניין? 📚`,
        instagram: `📚✨ ${businessName}\n\n${offerDescription}\n\nהדרך לעתיד שלך מתחילה כאן! 🌟\n#למידה #חינוך`,
        videoIdea: `סרטון: סטודנט מדבר על התוצאות, הנחה מוצעת, השראה חזקה.`,
      },
    ],
    "תעבורה": [
      {
        headline: `🚕 ${businessName} - נסע בנוחות!`,
        body: `${offerDescription}\n\n${targetAudience} - הנסיעה שלך חשובה.\n${businessName} - בטיחות, נוחות וטובות לכולם.`,
        cta: "הזמן עכשיו 🚕",
        whatsapp: `${businessName} לשירותך: ${offerDescription}. אנחנו בדרך? 🚕`,
        instagram: `🚕✨ ${businessName}\n\n${offerDescription}\n\nהנסיעה שלך - במרחק קליק! 📱\n#בטיחות #נחמד`,
        videoIdea: `סרטון: נסיעה חלקה, לקוח שמח, טיפולים מעולים, הנחה.`,
      },
    ],
    "כללי": [
      {
        headline: `🎯 ${businessName} - הדיל שחיכיתם לו!`,
        body: `${offerDescription}\n\n${targetAudience} - זה בשביל אתכם!\n${businessName} מחייבת טיפול טוב וערך אמיתי. בואו נעשה זאת ביחד.`,
        cta: "קבל את ההנחה 🎁",
        whatsapp: `${businessName} שמעה לקול הקהל: ${offerDescription}. בואו? 🎯`,
        instagram: `🎉 ${businessName}!\n\n${offerDescription}\n\nזה המחיר הטוב ביותר שנראית! 💛\n#משוגע_כמו_אתה`,
        videoIdea: `סרטון: אדם מדבר על כמה האהב את ההנחה, טרנספורמציה ברורה, לוגו.`,
      },
      {
        headline: `⭐ ${businessName} - למי שיודע לבחור!`,
        body: `${offerDescription}\n\nאתה לא בא להשלים. ${businessName} גם לא.\n${targetAudience} - בואו נהיה טובים ביחד.`,
        cta: "אני רוצה הזה ⭐",
        whatsapp: `${businessName} שיתפה אתך סוד: ${offerDescription}. רוצה לדעת עוד? 🤫`,
        instagram: `⭐ ${businessName}\n\n${offerDescription}\n\nלא משנה מה בחרת - זה יהיה נכון! ✨\n#בחוכמה`,
        videoIdea: `סרטון: עדים שמעידים על איכות, הנחה מוצעת בסוף, דחיפות.`,
      },
    ],
  };

  // בחר קטגוריה או כללי
  const templates = categoryTemplates[businessCategory] || categoryTemplates["כללי"];

  // בחר טמפלט אקראי מהקטגוריה
  const seed = (businessName + offerDescription).length % templates.length;
  const template = templates[seed];

  return {
    ...template,
    id: `campaign_${Date.now()}`,
    createdAt: new Date().toISOString(),
    businessName,
    businessCategory,
    targetAudience,
    offerDescription,
  };
}
