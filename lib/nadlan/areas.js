// SAMPLE DATA for the prototype. City and neighborhood names and their map
// positions are real, but every number and signal here is illustrative, made up
// to show how the engine works. Do not use it for real decisions. It is
// replaced by real data (transactions from the Tax Authority, CBS indices,
// planning decisions) once the daily data import exists.
//
// Fields per area:
//   pricePerSqm      average price per square meter, ₪
//   change12m        price change over the last 12 months, %
//   rentYield        yearly rent / price, %
//   transactions12m  number of sales in the last 12 months
//   signals          growth drivers: { kind: 'transport' | 'renewal' | 'development' | 'employment', text }
//   risks            texts describing what could hold prices back

export const IS_SAMPLE_DATA = true;

export const cities = [
    { id: 'tel-aviv', name: 'תל אביב-יפו', lat: 32.08, lng: 34.78 },
    { id: 'jerusalem', name: 'ירושלים', lat: 31.77, lng: 35.21 },
    { id: 'haifa', name: 'חיפה', lat: 32.8, lng: 35.0 },
    { id: 'beer-sheva', name: 'באר שבע', lat: 31.25, lng: 34.79 },
    { id: 'rishon', name: 'ראשון לציון', lat: 31.97, lng: 34.79 },
    { id: 'petah-tikva', name: 'פתח תקווה', lat: 32.09, lng: 34.89 },
    { id: 'netanya', name: 'נתניה', lat: 32.32, lng: 34.86 },
    { id: 'ashdod', name: 'אשדוד', lat: 31.8, lng: 34.65 },
    { id: 'holon', name: 'חולון', lat: 32.02, lng: 34.78 },
    { id: 'ramat-gan', name: 'רמת גן', lat: 32.08, lng: 34.82 },
    { id: 'ramla', name: 'רמלה', lat: 31.93, lng: 34.87 },
    { id: 'lod', name: 'לוד', lat: 31.95, lng: 34.89 },
    { id: 'hadera', name: 'חדרה', lat: 32.44, lng: 34.92 },
    { id: 'afula', name: 'עפולה', lat: 32.61, lng: 35.29 },
    { id: 'ashkelon', name: 'אשקלון', lat: 31.67, lng: 34.57 },
    { id: 'beit-shemesh', name: 'בית שמש', lat: 31.73, lng: 34.99 }
];

const T = (text) => ({ kind: 'transport', text });
const R = (text) => ({ kind: 'renewal', text });
const D = (text) => ({ kind: 'development', text });
const E = (text) => ({ kind: 'employment', text });

export const areas = [
    // תל אביב-יפו
    { id: 'tlv-florentin', city: 'tel-aviv', name: 'פלורנטין', lat: 32.056, lng: 34.77, pricePerSqm: 62000, change12m: 4.1, rentYield: 3.0, transactions12m: 240, signals: [T('קו אדום של הרכבת הקלה בהליכה'), R('כמה פרויקטים של תמ״א 38 בביצוע')], risks: ['מחיר כניסה גבוה מאוד'] },
    { id: 'tlv-yad-eliyahu', city: 'tel-aviv', name: 'יד אליהו', lat: 32.058, lng: 34.795, pricePerSqm: 54000, change12m: 6.3, rentYield: 3.1, transactions12m: 180, signals: [T('קו סגול מתוכנן'), R('מתחמי פינוי-בינוי מאושרים'), D('קרבה למתחמי תעסוקה חדשים')], risks: ['שנים של עבודות תשתית'] },
    { id: 'tlv-ramat-aviv', city: 'tel-aviv', name: 'רמת אביב', lat: 32.113, lng: 34.8, pricePerSqm: 72000, change12m: 2.2, rentYield: 2.5, transactions12m: 150, signals: [E('קרבה לאוניברסיטה')], risks: ['מחירים כבר בשיא', 'תשואה נמוכה'] },

    // ירושלים
    { id: 'jlm-arnona', city: 'jerusalem', name: 'ארנונה', lat: 31.75, lng: 35.222, pricePerSqm: 44000, change12m: 5.0, rentYield: 2.9, transactions12m: 130, signals: [T('הקו הכחול של הרכבת הקלה מתוכנן'), D('בנייה חדשה סביב השכונה')], risks: ['היצע חדש גדול'] },
    { id: 'jlm-kiryat-yovel', city: 'jerusalem', name: 'קריית יובל', lat: 31.765, lng: 35.177, pricePerSqm: 36000, change12m: 7.4, rentYield: 3.3, transactions12m: 210, signals: [R('מתחמי פינוי-בינוי גדולים'), T('הקו הכחול של הרכבת הקלה מתוכנן'), R('תוכנית התחדשות כוללת לשכונה')], risks: ['זמן ארוך עד ביצוע'] },
    { id: 'jlm-pisgat-zeev', city: 'jerusalem', name: 'פסגת זאב', lat: 31.825, lng: 35.243, pricePerSqm: 29000, change12m: 3.5, rentYield: 3.6, transactions12m: 260, signals: [T('קו אדום של הרכבת הקלה')], risks: ['ביקוש תלוי בקהל יעד מצומצם'] },

    // חיפה
    { id: 'hfa-hadar', city: 'haifa', name: 'הדר', lat: 32.808, lng: 34.996, pricePerSqm: 14000, change12m: 8.2, rentYield: 4.6, transactions12m: 320, signals: [R('תוכנית להתחדשות עירונית בהדר'), E('קרבה למתחם הנמל ומרכזי תעסוקה'), T('מטרונית ותחבורה ציבורית')], risks: ['מבנים ישנים שדורשים שיפוץ'] },
    { id: 'hfa-carmel', city: 'haifa', name: 'מרכז הכרמל', lat: 32.795, lng: 34.985, pricePerSqm: 25000, change12m: 3.0, rentYield: 3.2, transactions12m: 170, signals: [T('הכרמלית')], risks: ['מחירים יציבים, צמיחה איטית'] },
    { id: 'hfa-kiryat-haim', city: 'haifa', name: 'קריית חיים', lat: 32.833, lng: 35.06, pricePerSqm: 19000, change12m: 6.0, rentYield: 3.8, transactions12m: 190, signals: [T('קו הרכבת הקלה חיפה–נצרת'), R('פרויקטים של פינוי-בינוי')], risks: ['קרבה לאזור תעשייה'] },

    // באר שבע
    { id: 'bs-ramot', city: 'beer-sheva', name: 'רמות', lat: 31.27, lng: 34.81, pricePerSqm: 17000, change12m: 4.5, rentYield: 3.4, transactions12m: 230, signals: [D('בנייה חדשה ומוסדות חינוך')], risks: ['היצע חדש גדול'] },
    { id: 'bs-gimel', city: 'beer-sheva', name: 'שכונה ג׳', lat: 31.253, lng: 34.795, pricePerSqm: 12500, change12m: 9.1, rentYield: 5.0, transactions12m: 280, signals: [E('קרבה לאוניברסיטת בן-גוריון ולביקוש סטודנטים'), R('תוכניות התחדשות עירונית'), E('מעבר יחידות צה״ל לנגב')], risks: ['שכירות עם תחלופה גבוהה'] },
    { id: 'bs-old-city', city: 'beer-sheva', name: 'העיר העתיקה', lat: 31.24, lng: 34.787, pricePerSqm: 13500, change12m: 7.0, rentYield: 4.5, transactions12m: 120, signals: [D('תוכנית לחידוש מרכז העיר'), T('קרבה לתחנת הרכבת')], risks: ['מעט עסקאות, קשה למכור מהר'] },

    // ראשון לציון
    { id: 'rishon-west', city: 'rishon', name: 'מערב ראשון', lat: 31.987, lng: 34.755, pricePerSqm: 33000, change12m: 3.2, rentYield: 2.8, transactions12m: 260, signals: [D('שכונות חדשות ופארקים')], risks: ['מחירים גבוהים לעיר'] },
    { id: 'rishon-center', city: 'rishon', name: 'מרכז העיר', lat: 31.964, lng: 34.804, pricePerSqm: 26000, change12m: 6.8, rentYield: 3.4, transactions12m: 200, signals: [R('פינוי-בינוי במרכז העיר'), T('הקו האדום של הרכבת הקלה')], risks: ['עבודות ממושכות'] },

    // פתח תקווה
    { id: 'pt-kfar-ganim', city: 'petah-tikva', name: 'כפר גנים', lat: 32.075, lng: 34.9, pricePerSqm: 30000, change12m: 3.8, rentYield: 2.9, transactions12m: 210, signals: [D('שכונה חדשה יחסית ומבוקשת')], risks: ['מעט מקום לעליית מחיר נוספת'] },
    { id: 'pt-center', city: 'petah-tikva', name: 'מרכז העיר', lat: 32.088, lng: 34.887, pricePerSqm: 24000, change12m: 7.2, rentYield: 3.5, transactions12m: 240, signals: [T('הקו האדום של הרכבת הקלה'), R('התחדשות עירונית במרכז'), E('קרבה לאזורי תעסוקה')], risks: ['צפיפות ותנועה'] },

    // נתניה
    { id: 'net-ir-yamim', city: 'netanya', name: 'עיר ימים', lat: 32.282, lng: 34.845, pricePerSqm: 28000, change12m: 3.0, rentYield: 3.0, transactions12m: 180, signals: [D('שכונה חדשה ליד הים')], risks: ['היצע גדול של דירות חדשות'] },
    { id: 'net-center', city: 'netanya', name: 'מרכז העיר', lat: 32.33, lng: 34.857, pricePerSqm: 21000, change12m: 6.1, rentYield: 3.7, transactions12m: 250, signals: [R('תמ״א 38 ופינוי-בינוי'), T('קרבה לתחנת הרכבת')], risks: ['מבנים ישנים'] },

    // אשדוד
    { id: 'ash-marina', city: 'ashdod', name: 'רובע המרינה', lat: 31.799, lng: 34.636, pricePerSqm: 24000, change12m: 4.0, rentYield: 3.0, transactions12m: 140, signals: [D('פיתוח המרינה וחוף הים')], risks: ['פרויקטים יוקרתיים יקרים'] },
    { id: 'ash-gimel', city: 'ashdod', name: 'רובע ג׳', lat: 31.81, lng: 34.65, pricePerSqm: 17500, change12m: 6.5, rentYield: 3.9, transactions12m: 220, signals: [R('פינוי-בינוי ברובעים הוותיקים'), E('הרחבת הנמל ותעסוקה')], risks: ['מבנים ישנים'] },

    // חולון
    { id: 'holon-jessy', city: 'holon', name: 'ג׳סי כהן', lat: 32.006, lng: 34.771, pricePerSqm: 22000, change12m: 8.0, rentYield: 3.8, transactions12m: 190, signals: [R('תוכנית פינוי-בינוי גדולה לשכונה'), T('הקו האדום של הרכבת הקלה בקרבת מקום')], risks: ['תהליך פינוי-בינוי יכול להימשך שנים'] },
    { id: 'holon-tel-giborim', city: 'holon', name: 'תל גיבורים', lat: 32.023, lng: 34.78, pricePerSqm: 27000, change12m: 4.3, rentYield: 3.1, transactions12m: 150, signals: [R('תמ״א 38')], risks: [] },

    // רמת גן
    { id: 'rg-marom-nave', city: 'ramat-gan', name: 'מרום נווה', lat: 32.069, lng: 34.832, pricePerSqm: 34000, change12m: 7.8, rentYield: 3.2, transactions12m: 170, signals: [R('מתחמי פינוי-בינוי רבים'), T('הקו האדום של הרכבת הקלה'), E('קרבה לבורסה')], risks: ['עבודות בנייה בכל השכונה'] },
    { id: 'rg-ramat-hen', city: 'ramat-gan', name: 'רמת חן', lat: 32.087, lng: 34.825, pricePerSqm: 46000, change12m: 2.5, rentYield: 2.6, transactions12m: 90, signals: [], risks: ['שכונה יקרה ובשלה'] },

    // רמלה
    { id: 'ramla-center', city: 'ramla', name: 'מרכז העיר', lat: 31.928, lng: 34.873, pricePerSqm: 15500, change12m: 9.5, rentYield: 4.4, transactions12m: 210, signals: [T('תחנת רכבת ומיקום מרכזי'), R('התחדשות עירונית'), D('שכונות חדשות בסביבה')], risks: ['תדמית העיר עדיין משתנה'] },
    { id: 'ramla-north', city: 'ramla', name: 'צפון העיר', lat: 31.94, lng: 34.865, pricePerSqm: 17000, change12m: 7.6, rentYield: 3.9, transactions12m: 180, signals: [D('בנייה חדשה רחבה')], risks: ['היצע חדש גדול'] },

    // לוד
    { id: 'lod-ganei-aviv', city: 'lod', name: 'גני אביב', lat: 31.957, lng: 34.881, pricePerSqm: 17500, change12m: 8.4, rentYield: 3.8, transactions12m: 230, signals: [T('קרבה לתחנת רכבת מרכזית'), D('שכונה חדשה וצעירה')], risks: ['התחרות עם פרויקטים חדשים'] },
    { id: 'lod-center', city: 'lod', name: 'מרכז העיר', lat: 31.951, lng: 34.895, pricePerSqm: 13000, change12m: 6.0, rentYield: 4.7, transactions12m: 150, signals: [R('תוכנית לחידוש מרכז העיר')], risks: ['תדמית ובעיות ביטחון אישי'] },

    // חדרה
    { id: 'hadera-givat-olga', city: 'hadera', name: 'גבעת אולגה', lat: 32.444, lng: 34.873, pricePerSqm: 19000, change12m: 7.0, rentYield: 3.6, transactions12m: 140, signals: [D('פיתוח חוף הים'), R('התחדשות עירונית')], risks: [] },
    { id: 'hadera-center', city: 'hadera', name: 'מרכז העיר', lat: 32.437, lng: 34.919, pricePerSqm: 17000, change12m: 8.8, rentYield: 3.9, transactions12m: 220, signals: [T('תחנת רכבת וכביש 6'), D('שכונות חדשות גדולות'), E('הגירה פנימית מהמרכז')], risks: ['היצע חדש גדול'] },

    // עפולה
    { id: 'afula-ilit', city: 'afula', name: 'עפולה עילית', lat: 32.62, lng: 35.311, pricePerSqm: 13000, change12m: 6.2, rentYield: 4.0, transactions12m: 120, signals: [D('הרחבת השכונה')], risks: ['מרחק ממרכזי תעסוקה'] },
    { id: 'afula-center', city: 'afula', name: 'מרכז העיר', lat: 32.607, lng: 35.289, pricePerSqm: 12000, change12m: 7.5, rentYield: 4.4, transactions12m: 160, signals: [T('רכבת העמק'), E('בית חולים וקמפוס אוניברסיטאי מתוכנן')], risks: ['שוק קטן, פחות נזילות'] },

    // אשקלון
    { id: 'ashk-barnea', city: 'ashkelon', name: 'ברנע', lat: 31.68, lng: 34.565, pricePerSqm: 18500, change12m: 5.0, rentYield: 3.5, transactions12m: 170, signals: [D('קרבה לים ופיתוח טיילת')], risks: ['מצב ביטחוני'] },
    { id: 'ashk-agamim', city: 'ashkelon', name: 'אגמים', lat: 31.65, lng: 34.59, pricePerSqm: 16000, change12m: 6.8, rentYield: 3.6, transactions12m: 240, signals: [D('שכונה חדשה וצעירה'), T('קרבה לתחנת הרכבת')], risks: ['היצע חדש גדול', 'מצב ביטחוני'] },

    // בית שמש
    { id: 'bsh-rbs', city: 'beit-shemesh', name: 'רמת בית שמש', lat: 31.715, lng: 34.985, pricePerSqm: 20000, change12m: 5.5, rentYield: 3.4, transactions12m: 260, signals: [D('בנייה רחבה ושכונות חדשות')], risks: ['ביקוש תלוי בקהל יעד מסוים'] },
    { id: 'bsh-center', city: 'beit-shemesh', name: 'מרכז העיר', lat: 31.749, lng: 34.988, pricePerSqm: 17500, change12m: 7.3, rentYield: 3.7, transactions12m: 150, signals: [T('רכבת לירושלים ולתל אביב'), R('התחדשות עירונית')], risks: [] }
];
