// תבניות גיבוי לשימוש כשאין מפתח Claude. המפתחות חייבים להתאים בדיוק
// לרשימת הקטגוריות ב-app/adigo/setup/page.jsx, אחרת נופלים לברירת המחדל.
const TEMPLATES = {
  "בית קפה": [
    {
      headline: `{{business}} — הקפה שמחכה לך בבוקר`,
      body: `{{offer}}\n\nכוס טובה, מקום נעים, ואנשים שמכירים אותך בשם.`,
      cta: "קפצו אלינו",
      whatsapp: `בוקר טוב! עדכון קטן מ{{business}}: {{offer}}\nמחכים לכם.`,
      instagram: `☕ {{business}}\n\n{{offer}}\n\nנתראה בבוקר\n#קפה #{{tag}}`,
      videoIdea: "צילום קרוב של הכנת הקפה, קצף נמזג, ואז חיוך של לקוח. 15 שניות.",
    },
  ],
  "מסעדה": [
    {
      headline: `{{business}} — ארוחה שמחכה לכם`,
      body: `{{offer}}\n\n{{audience}} — שמורים לכם מקום.`,
      cta: "להזמנת שולחן",
      whatsapp: `שלום! {{business}} כאן: {{offer}}\nרוצים שנשמור לכם שולחן?`,
      instagram: `🍽️ {{business}}\n\n{{offer}}\n\n#אוכלטוב #{{tag}}`,
      videoIdea: "מנה יוצאת מהמטבח, אדים עולים, המצלמה עוקבת עד לשולחן.",
    },
  ],
  "מאפייה": [
    {
      headline: `{{business}} — יוצא חם מהתנור`,
      body: `{{offer}}\n\nאופים כל בוקר מחדש, בלי קיצורי דרך.`,
      cta: "בואו בזמן, זה נגמר מהר",
      whatsapp: `שלום! {{offer}}\nמי שרוצה — שיגיע מוקדם, זה נגמר מהר.`,
      instagram: `🥐 {{business}}\n\n{{offer}}\n\n#מאפייה #{{tag}}`,
      videoIdea: "מגש יוצא מהתנור, קרוב על הקראסט, ידיים פורסות.",
    },
  ],
  "צרכנייה או מכולת": [
    {
      headline: `{{business}} — מה שצריך, קרוב לבית`,
      body: `{{offer}}\n\n{{audience}} — אנחנו כאן ממש מעבר לפינה.`,
      cta: "מחכים לכם",
      whatsapp: `שלום לכולם, עדכון מ{{business}}: {{offer}}\nתודה שאתם קונים אצלנו.`,
      instagram: `🛒 {{business}}\n\n{{offer}}\n\n#קוניםבשכונה #{{tag}}`,
      videoIdea: "מעבר בין מדפים מלאים, יד לוקחת מוצר, קופה, חיוך.",
    },
  ],
  "חנות בגדים": [
    {
      headline: `{{business}} — הפריט שחיפשתם`,
      body: `{{offer}}\n\n{{audience}} — בואו למדוד, בלי התחייבות.`,
      cta: "בואו למדוד",
      whatsapp: `היי! {{business}}: {{offer}}\nשווה קפיצה.`,
      instagram: `👗 {{business}}\n\n{{offer}}\n\n#אופנה #{{tag}}`,
      videoIdea: "שלוש תלבושות בהחלפה מהירה, סיבוב מול המראה.",
    },
  ],
  "מספרה": [
    {
      headline: `{{business}} — תור פנוי השבוע`,
      body: `{{offer}}\n\nנכנסים כמו שאתם, יוצאים מרגישים אחרת.`,
      cta: "לקביעת תור",
      whatsapp: `שלום! {{offer}}\nיש לי תורים פנויים השבוע — לכתוב לך אחד?`,
      instagram: `✂️ {{business}}\n\n{{offer}}\n\n#מספרה #{{tag}}`,
      videoIdea: "לפני ואחרי, חיתוך מהיר בטיים-לפס, סיבוב כיסא בסוף.",
    },
  ],
  "מכון יופי": [
    {
      headline: `{{business}} — שעה רק בשבילך`,
      body: `{{offer}}\n\n{{audience}} — מגיע לך לעצור לרגע.`,
      cta: "לקביעת תור",
      whatsapp: `שלום! {{offer}}\nרוצה שאשמור לך תור?`,
      instagram: `✨ {{business}}\n\n{{offer}}\n\n#טיפוח #{{tag}}`,
      videoIdea: "ידיים עובדות בעדינות, תאורה רכה, נשימה עמוקה בסוף.",
    },
  ],
  "חדר כושר": [
    {
      headline: `{{business}} — מתחילים השבוע`,
      body: `{{offer}}\n\n{{audience}} — בלי שיפוטיות, בקצב שלכם.`,
      cta: "לפרטים והרשמה",
      whatsapp: `היי! {{offer}}\nרוצה לבוא לראות את המקום?`,
      instagram: `💪 {{business}}\n\n{{offer}}\n\n#כושר #{{tag}}`,
      videoIdea: "סט קצר, טפטוף זיעה, ואז חיוך. אנרגיה גבוהה, 15 שניות.",
    },
  ],
  "מוסך": [
    {
      headline: `{{business}} — הרכב שלכם בידיים טובות`,
      body: `{{offer}}\n\nבודקים, מסבירים, ורק אז מתקנים.`,
      cta: "לתיאום בדיקה",
      whatsapp: `שלום! {{business}}: {{offer}}\nרוצה שנבדוק לך את הרכב?`,
      instagram: `🔧 {{business}}\n\n{{offer}}\n\n#מוסך #{{tag}}`,
      videoIdea: "רכב עולה על המגבה, בדיקה מהירה, לחיצת יד בסוף.",
    },
  ],
};

const DEFAULT_TEMPLATES = [
  {
    headline: `{{business}} — יש לנו חדשות`,
    body: `{{offer}}\n\n{{audience}} — שווה לכם להכיר.`,
    cta: "לפרטים נוספים",
    whatsapp: `שלום! עדכון מ{{business}}: {{offer}}\nנשמח לראות אתכם.`,
    instagram: `✨ {{business}}\n\n{{offer}}\n\n#{{tag}}`,
    videoIdea: "צילום קצר של המקום, המוצר במרכז, ובסוף השם והפרטים.",
  },
  {
    headline: `{{business}} — למי שיודע לבחור`,
    body: `{{offer}}\n\nאנחנו לא מתפשרים, ואתם גם לא צריכים.`,
    cta: "בואו לראות",
    whatsapp: `היי! {{offer}}\nחשבתי שזה יעניין אותך.`,
    instagram: `⭐ {{business}}\n\n{{offer}}\n\n#{{tag}}`,
    videoIdea: "לקוח מספר במשפט אחד למה הוא חוזר, ואז לוגו.",
  },
];

function fill(text, values) {
  return text
    .replace(/\{\{business\}\}/g, values.business)
    .replace(/\{\{offer\}\}/g, values.offer)
    .replace(/\{\{audience\}\}/g, values.audience)
    .replace(/\{\{tag\}\}/g, values.tag);
}

export async function generateCampaignMock(campaignData) {
  const { businessName, businessCategory, targetAudience, offerDescription } =
    campaignData;

  await new Promise((resolve) => setTimeout(resolve, 600));

  const pool = TEMPLATES[businessCategory] || DEFAULT_TEMPLATES;
  const seed = (businessName + offerDescription).length % pool.length;
  const template = pool[seed];

  const values = {
    business: businessName,
    offer: offerDescription,
    audience: targetAudience,
    tag: businessName.replace(/\s+/g, ""),
  };

  return {
    headline: fill(template.headline, values),
    body: fill(template.body, values),
    cta: fill(template.cta, values),
    whatsapp: fill(template.whatsapp, values),
    instagram: fill(template.instagram, values),
    videoIdea: fill(template.videoIdea, values),
    id: `campaign_${Date.now()}`,
    createdAt: new Date().toISOString(),
    businessName,
    businessCategory,
    targetAudience,
    offerDescription,
  };
}
