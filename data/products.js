/*
Local catalog for מאיה בוטיק.

This is the fallback source of truth: when the Shopify Storefront credentials are
configured (see lib/shopify.js), products are pulled live from Shopify instead and
this file is only used for local development and previews.
*/

export const categories = [
    { slug: 'dresses', name: 'שמלות' },
    { slug: 'tops', name: 'חולצות' },
    { slug: 'knitwear', name: 'סריגים' },
    { slug: 'bottoms', name: 'חצאיות ומכנסיים' },
    { slug: 'outerwear', name: 'מעילים' },
    { slug: 'accessories', name: 'אקססוריז' }
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export const products = [
    {
        slug: 'alma-linen-dress',
        title: 'שמלת פשתן אלמה',
        category: 'dresses',
        price: 389,
        compareAtPrice: null,
        badge: 'חדש',
        featured: true,
        shortDescription: 'שמלת מידי מפשתן רחוץ, בגזרה נופלת עם חגורת קשירה במותן.',
        description:
            'אלמה היא השמלה שנלבשת מבוקר עד ערב. הפשתן הרחוץ מתרכך עם כל כביסה, הגזרה נופלת בקלילות מהכתף והחגורה מאפשרת להדגיש את קו המותן או להשאיר אותה פתוחה. נתפרה בסדרה קטנה בתל אביב.',
        details: ['100% פשתן אירופאי רחוץ', 'אורך מידי, כ-118 ס"מ', 'כיסים נסתרים בצדדים', 'כביסה עדינה ב-30 מעלות'],
        colors: [
            { name: 'חול', hex: '#d9c5ad' },
            { name: 'לבן שמנת', hex: '#f2ece1' },
            { name: 'זית', hex: '#7f8768' }
        ],
        sizes: SIZES,
        image: '/images/products/alma-linen-dress.svg'
    },
    {
        slug: 'nova-maxi-dress',
        title: 'שמלת מקסי נובה',
        category: 'dresses',
        price: 459,
        compareAtPrice: null,
        badge: null,
        featured: true,
        shortDescription: 'מקסי בגזרת מעטפת עם שרוול ארוך ומחשוף V רך.',
        description:
            'שמלת ערב שאפשר גם ללבוש ליום. גזרת המעטפת מחמיאה לכל מבנה גוף, השרוול הארוך מסתיים בחפת עדין והבד נופל יפה בתנועה. מושלמת לאירועים ולערבי קיץ.',
        details: ['ויסקוזה נושמת', 'אורך מקסי, כ-140 ס"מ', 'סגירת קשירה בצד', 'ניקוי יבש בלבד'],
        colors: [
            { name: 'ורד עתיק', hex: '#e0bcb9' },
            { name: 'שחור', hex: '#2b2724' }
        ],
        sizes: SIZES,
        image: '/images/products/nova-maxi-dress.svg'
    },
    {
        slug: 'tamar-cotton-dress',
        title: 'שמלת כותנה תמר',
        category: 'dresses',
        price: 329,
        compareAtPrice: 429,
        badge: 'מבצע',
        featured: false,
        shortDescription: 'שמלת יום קצרה מכותנה אורגנית, עם כפתורים קדמיים.',
        description:
            'שמלה יומיומית בגזרה קלילה, עם שורת כפתורים קדמית שמאפשרת ללבוש אותה גם פתוחה מעל גופייה. כותנה אורגנית מאושרת GOTS, נעימה גם בחום הישראלי.',
        details: ['100% כותנה אורגנית GOTS', 'אורך קצר, כ-92 ס"מ', 'כפתורי צדף טבעיים', 'כביסת מכונה 30 מעלות'],
        colors: [
            { name: 'מרווה', hex: '#c2ceb6' },
            { name: 'תכלת', hex: '#c3d2dd' }
        ],
        sizes: SIZES,
        image: '/images/products/tamar-cotton-dress.svg'
    },
    {
        slug: 'lilach-silk-blouse',
        title: 'חולצת משי לילך',
        category: 'tops',
        price: 279,
        compareAtPrice: null,
        badge: null,
        featured: true,
        shortDescription: 'חולצת משי בגזרה רכה עם שרוול ארוך ומחשוף עגול.',
        description:
            'החולצה שהופכת ג׳ינס לאאוטפיט. משי בעל נפילה נהדרת, גזרה נקייה בלי עודף בד ומחשוף עגול עדין. נלבשת בפני עצמה בקיץ ומתחת לסריג בחורף.',
        details: ['100% משי טוט', 'שרוול ארוך עם חפת', 'גזרה רגילה', 'כביסה ידנית או ניקוי יבש'],
        colors: [
            { name: 'ורד אבק', hex: '#e0bcb9' },
            { name: 'שמנת', hex: '#f2ece1' },
            { name: 'פחם', hex: '#3c3a39' }
        ],
        sizes: SIZES,
        image: '/images/products/lilach-silk-blouse.svg'
    },
    {
        slug: 'maya-linen-shirt',
        title: 'חולצת פשתן מאיה',
        category: 'tops',
        price: 229,
        compareAtPrice: null,
        badge: 'רב מכר',
        featured: true,
        shortDescription: 'החולצה שהבוטיק נקרא על שמה — פשתן קלאסי בגזרת בוקס.',
        description:
            'החולצה הראשונה שתפרנו, ועדיין הנמכרת ביותר. גזרת בוקס נוחה, כתף מורדת ופשתן שנעשה יפה יותר עם השנים. יש לנו אותה בארון בשלושה צבעים, וזו לא בושה.',
        details: ['100% פשתן רחוץ', 'גזרת בוקס רחבה', 'כיס חזה יחיד', 'כביסת מכונה עדינה'],
        colors: [
            { name: 'אבן', hex: '#cbc7bc' },
            { name: 'לבן', hex: '#f6f3ee' },
            { name: 'חמרה', hex: '#b0755c' }
        ],
        sizes: SIZES,
        image: '/images/products/maya-linen-shirt.svg'
    },
    {
        slug: 'sharon-oversize-shirt',
        title: 'חולצת אוברסייז שרון',
        category: 'tops',
        price: 199,
        compareAtPrice: null,
        badge: null,
        featured: false,
        shortDescription: 'חולצת פופלין רחבה, ארוכה מאחור, נהדרת מעל לגינגס.',
        description:
            'גזרה אוברסייז אמיתית: כתף רחבה, שרוול ארוך שאפשר לקפל, ואורך שמכסה מאחור. פופלין כותנה פריך שמתרכך אחרי הכביסה הראשונה.',
        details: ['כותנת פופלין', 'אורך א-סימטרי', 'שסע בצדדים', 'כביסת מכונה 40 מעלות'],
        colors: [
            { name: 'תכלת רחוץ', hex: '#bec3ce' },
            { name: 'לבן', hex: '#f6f3ee' }
        ],
        sizes: SIZES,
        image: '/images/products/sharon-oversize-shirt.svg'
    },
    {
        slug: 'horef-mohair-knit',
        title: 'סריג מוהר חורף',
        category: 'knitwear',
        price: 349,
        compareAtPrice: null,
        badge: null,
        featured: true,
        shortDescription: 'סריג מוהר רך במיוחד, בגזרה קצרה מעט וכתף מורדת.',
        description:
            'הסריג שלא רוצים להוריד. תערובת מוהר וצמר מרינו שיוצרת מרקם ענן, בגזרה קצרה מעט שמתאימה מעל מכנס גבוה. חם באמת, בלי להיות כבד.',
        details: ['60% מוהר, 40% מרינו', 'גזרה קרופ קלה', 'כתף מורדת', 'כביסה ידנית במים קרים'],
        colors: [
            { name: 'קרמל', hex: '#ddb9a2' },
            { name: 'אפור בהיר', hex: '#cbc7bc' }
        ],
        sizes: SIZES,
        image: '/images/products/horef-mohair-knit.svg'
    },
    {
        slug: 'inbar-wool-knit',
        title: 'סריג צמר ענבר',
        category: 'knitwear',
        price: 399,
        compareAtPrice: null,
        badge: null,
        featured: false,
        shortDescription: 'סריג צמר עבה בסריגת קלת, עם צווארון גולף רך.',
        description:
            'סריגת קלת קלאסית בצמר עבה, עם צווארון גולף שאפשר לקפל. פריט חורף שנשאר בארון שנים — בדיוק בשביל זה בחרנו חוט צמר שלא מתגלגל.',
        details: ['100% צמר', 'סריגת קלת', 'צווארון גולף', 'כביסה ידנית או תוכנית צמר'],
        colors: [
            { name: 'חול', hex: '#d9c5ad' },
            { name: 'ירוק יער', hex: '#4f5f4a' }
        ],
        sizes: SIZES,
        image: '/images/products/inbar-wool-knit.svg'
    },
    {
        slug: 'yaara-midi-skirt',
        title: 'חצאית מידי יערה',
        category: 'bottoms',
        price: 289,
        compareAtPrice: null,
        badge: null,
        featured: true,
        shortDescription: 'חצאית מידי בגזרת A עם מותן גבוה וכיסים.',
        description:
            'חצאית שנופלת בדיוק במקום הנכון: מותן גבוה שמעצב, גזרת A שנוחה להליכה וכיסים אמיתיים. נלבשת עם סניקרס ביום ועם עקב בערב.',
        details: ['תערובת פשתן וויסקוזה', 'אורך מידי, כ-78 ס"מ', 'רוכסן נסתר מאחור', 'כביסת מכונה עדינה'],
        colors: [
            { name: 'מרווה', hex: '#c2ceb6' },
            { name: 'שחור', hex: '#2b2724' }
        ],
        sizes: SIZES,
        image: '/images/products/yaara-midi-skirt.svg'
    },
    {
        slug: 'rotem-linen-trousers',
        title: 'מכנסי פשתן רותם',
        category: 'bottoms',
        price: 269,
        compareAtPrice: null,
        badge: null,
        featured: false,
        shortDescription: 'מכנס רחב מפשתן עם גומי במותן — נוח כמו פיג׳מה.',
        description:
            'מכנס קיץ רחב עם גומי מוסתר במותן, בגזרה שנופלת ישר ולא נדבקת. הפשתן נושם, מתייבש מהר ומתאים גם לימים הלחים.',
        details: ['תערובת פשתן וכותנה', 'גומי מוסתר במותן', 'שני כיסים צדדיים', 'כביסת מכונה 30 מעלות'],
        colors: [
            { name: 'כחול רחוץ', hex: '#bec3ce' },
            { name: 'חול', hex: '#d9c5ad' }
        ],
        sizes: SIZES,
        image: '/images/products/rotem-linen-trousers.svg'
    },
    {
        slug: 'noam-overcoat',
        title: 'מעיל אוברקוט נועם',
        category: 'outerwear',
        price: 749,
        compareAtPrice: 899,
        badge: 'מבצע',
        featured: true,
        shortDescription: 'מעיל ארוך בגזרה ישרה עם דשים קלאסיים ובטנה מלאה.',
        description:
            'המעיל שסוגר את כל החורף. גזרה ישרה וארוכה שנופלת יפה גם מעל סריג עבה, דשים קלאסיים ובטנה מלאה. תערובת צמר שמחזיקה חום בלי משקל מיותר.',
        details: ['70% צמר, 30% פוליאמיד', 'אורך מקסי, כ-115 ס"מ', 'בטנה מלאה', 'ניקוי יבש בלבד'],
        colors: [
            { name: 'אפור אבן', hex: '#cbc7bc' },
            { name: 'גמל', hex: '#c19a6b' }
        ],
        sizes: SIZES,
        image: '/images/products/noam-overcoat.svg'
    },
    {
        slug: 'aviv-short-coat',
        title: 'מעיל קצר אביב',
        category: 'outerwear',
        price: 549,
        compareAtPrice: null,
        badge: null,
        featured: false,
        shortDescription: 'מעיל ביניים קליל לימי מעבר, בגזרה קצרה ורכה.',
        description:
            'לימים שבהם לא קר מספיק למעיל צמר אבל קריר מדי בלי כלום. גזרה קצרה, בד רך עם נפילה נעימה וכיסים גדולים. הפריט שנשאר תלוי ליד הדלת.',
        details: ['תערובת כותנה', 'אורך קצר, כ-70 ס"מ', 'שני כיסי טלאי', 'כביסת מכונה עדינה'],
        colors: [
            { name: 'ורוד עדין', hex: '#e5c4b9' },
            { name: 'שמנת', hex: '#f2ece1' }
        ],
        sizes: SIZES,
        image: '/images/products/aviv-short-coat.svg'
    },
    {
        slug: 'carmel-tote-bag',
        title: 'תיק בד כרמל',
        category: 'accessories',
        price: 149,
        compareAtPrice: null,
        badge: null,
        featured: false,
        shortDescription: 'תיק טוט מקנבס עבה עם ידיות עור ובטנה פנימית.',
        description:
            'תיק יומיומי שנכנס אליו הכל: לפטופ, בקבוק מים וזוג נעליים להחלפה. קנבס עבה שעומד בעצמו, ידיות עור אמיתי וכיס פנימי ברוכסן.',
        details: ['קנבס כותנה 400 גרם', 'ידיות עור טבעי', 'כיס פנימי ברוכסן', 'מידות 38x42 ס"מ'],
        colors: [{ name: 'חמרה', hex: '#ddb9a2' }],
        sizes: ['מידה אחת'],
        image: '/images/products/carmel-tote-bag.svg'
    },
    {
        slug: 'shaked-wool-scarf',
        title: 'צעיף צמר שקד',
        category: 'accessories',
        price: 129,
        compareAtPrice: null,
        badge: null,
        featured: false,
        shortDescription: 'צעיף צמר רך וארוך, נעים גם על העור.',
        description:
            'צעיף גדול מספיק כדי להתעטף בו, מצמר מסורק שלא מגרד. הפריט הכי קל להוסיף לכל אאוטפיט חורפי, ומתנה בטוחה.',
        details: ['100% צמר מסורק', 'מידות 190x45 ס"מ', 'גדילים בקצוות', 'כביסה ידנית'],
        colors: [
            { name: 'ורוד עדין', hex: '#e5c4b9' },
            { name: 'אפור', hex: '#cbc7bc' }
        ],
        sizes: ['מידה אחת'],
        image: '/images/products/shaked-wool-scarf.svg'
    }
];
