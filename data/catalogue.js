// MAOR — the catalogue.
//
// BEFORE LAUNCH: every price, measurement and line of copy below is a
// placeholder written to shape the layout. Replace it with the real figures
// before anything is published. The photographs are the shop's own.

export const ILS_TO_USD = 1 / 3.6;

export const CATEGORIES = {
    eyewear: {
        name: { he: 'משקפי שמש', en: 'Sunglasses' },
        lead: {
            he: 'מסגרות אצטט עם קו נקי וגיאומטריה שלא מתנצלת.',
            en: 'Acetate frames with a clean line and geometry that does not apologise.'
        }
    },
    watches: {
        name: { he: 'שעונים', en: 'Watches' },
        lead: {
            he: 'משהו שמסתכלים עליו כל היום, אז שיהיה שווה מבט.',
            en: 'Something you look at all day, so it had better be worth looking at.'
        }
    },
    jewellery: {
        name: { he: 'תכשיטים', en: 'Jewellery' },
        lead: {
            he: 'שרשראות וצמידים שמונחים על העור בלי לבקש תשומת לב.',
            en: 'Chains and bracelets that sit on skin without asking for attention.'
        }
    },
    bags: {
        name: { he: 'תיקים', en: 'Bags' },
        lead: { he: 'גודל שמכיל את מה שצריך ותו לא.', en: 'Sized for what you actually carry, and nothing more.' }
    },
    wallets: {
        name: { he: 'ארנקים', en: 'Wallets' },
        lead: {
            he: 'דק מספיק לכיס הקדמי, חכם מספיק כדי לא לאבד כרטיס.',
            en: 'Thin enough for a front pocket, smart enough not to lose a card.'
        }
    },
    caps: {
        name: { he: 'כובעים', en: 'Caps' },
        lead: { he: 'מבנה טוב, בלי לוגו שצועק.', en: 'Good structure, no shouting logo.' }
    }
};

export const COLOURS = {
    black: { he: 'שחור', en: 'Black', hex: '#17171a' },
    tortoise: { he: 'שריון צב', en: 'Tortoise', hex: '#7c451c' },
    steel: { he: 'פלדה', en: 'Steel', hex: '#9aa0a6' },
    silver: { he: 'כסף', en: 'Silver', hex: '#c6cad0' },
    gold: { he: 'זהב', en: 'Gold', hex: '#c9a24a' },
    rose: { he: 'רוז־גולד', en: 'Rose gold', hex: '#b76e53' },
    taupe: { he: 'טאופ', en: 'Taupe', hex: '#6b5a51' },
    ivory: { he: 'שנהב', en: 'Ivory', hex: '#e8e4dc' }
};

/**
 * One photograph, one product. Anything a shopper has to decide before buying
 * is a field here — nothing is hidden behind a swatch.
 */
export const products = [
    {
        slug: 'vault-wallet',
        category: 'wallets',
        name: { he: 'ארנק וולט', en: 'Vault Wallet' },
        subtitle: { he: 'לחיצה אחת, הכרטיסים בחוץ', en: 'One press, cards out' },
        price: 249,
        compareAt: 329,
        badge: 'bestseller',
        colour: 'black',
        image: '/shop/wallet.jpg',
        story: {
            he: 'ארנק בגודל כיס קדמי עם מנגנון דחיפה: מזיזים את הלשונית בצד והכרטיסים נפרשים כמו מניפה. תא שטרות, חלון לתעודה וכיס רוכסן למטבעות בגב.',
            en: 'A front-pocket wallet with a push mechanism: slide the tab and the cards fan out. Note compartment, ID window and a zip coin pocket on the back.'
        },
        details: {
            he: ['מנגנון דחיפה לעד 6 כרטיסים', 'בידוד RFID לשכבת הכרטיסים', 'חלון שקוף לתעודה', 'כיס רוכסן למטבעות'],
            en: ['Push mechanism for up to 6 cards', 'RFID-blocking card housing', 'Clear ID window', 'Zip coin pocket']
        },
        specs: [
            { label: { he: 'מידות', en: 'Size' }, value: { he: '10.5 × 8 × 2 ס״מ', en: '10.5 × 8 × 2 cm' } },
            { label: { he: 'חומר', en: 'Material' }, value: { he: 'עור סינתטי ואלומיניום', en: 'Synthetic leather and aluminium' } },
            { label: { he: 'משקל', en: 'Weight' }, value: { he: '95 גרם', en: '95 g' } },
            { label: { he: 'כרטיסים', en: 'Cards' }, value: { he: 'עד 6 במנגנון', en: 'Up to 6 in the slider' } }
        ],
        care: { he: 'ניגוב במטלית לחה, בלי ממיסים', en: 'Wipe with a damp cloth, no solvents' },
        stock: 12
    },
    {
        slug: 'vesper-bag',
        category: 'bags',
        name: { he: 'תיק וספר', en: 'Vesper Bag' },
        subtitle: { he: 'תיק כתף שיושב מתחת לזרוע', en: 'A shoulder bag that tucks under the arm' },
        price: 389,
        compareAt: null,
        badge: 'new',
        colour: 'taupe',
        image: '/shop/bag.jpg',
        story: {
            he: 'צורת סהר רכה עם רצועת שרשרת מוזהבת וכתפייה מרופדת. נכנס טלפון, ארנק, מפתחות ומשקפיים — ונעצר שם, וזה בדיוק העניין.',
            en: 'A soft crescent with a gold chain strap and a padded shoulder pad. Fits a phone, a wallet, keys and sunglasses, and stops there — which is the point.'
        },
        details: {
            he: ['רצועת שרשרת עם כתפייה מרופדת', 'סגירת רוכסן לאורך הפתח', 'תא פנימי אחד', 'מרקם גרגירי שלא מראה שריטות'],
            en: ['Chain strap with a padded pad', 'Full-length zip', 'One interior pocket', 'Pebbled texture that hides scuffs']
        },
        specs: [
            { label: { he: 'מידות', en: 'Size' }, value: { he: '28 × 15 × 7 ס״מ', en: '28 × 15 × 7 cm' } },
            { label: { he: 'רצועה', en: 'Strap' }, value: { he: 'שרשרת, נפילה 22 ס״מ', en: 'Chain, 22 cm drop' } },
            { label: { he: 'סגירה', en: 'Closure' }, value: { he: 'רוכסן', en: 'Zip' } },
            { label: { he: 'חומר', en: 'Material' }, value: { he: 'עור סינתטי גרגירי', en: 'Pebbled synthetic leather' } }
        ],
        care: { he: 'לאחסן בשקית בד, להרחיק מלחות', en: 'Store in a dust bag, keep away from damp' },
        stock: 6
    },
    {
        slug: 'chrono-watch',
        category: 'watches',
        name: { he: 'שעון סוברן', en: 'Sovereign Chronograph' },
        subtitle: { he: 'כרונוגרף רוז־גולד', en: 'Rose-gold chronograph' },
        price: 690,
        compareAt: 890,
        badge: 'bestseller',
        colour: 'rose',
        image: '/shop/chrono.jpg',
        story: {
            he: 'לוח שחור עם שלושה תת־חוגים, ספרות רומיות ולוח סיבובי אדום־שחור. צמיד פלדה דו־גוני עם אבזם פרפר.',
            en: 'A black dial with three sub-dials, Roman numerals and a red-and-black rotating bezel. Two-tone steel bracelet with a butterfly clasp.'
        },
        details: {
            he: ['מנגנון קוורץ', 'שלושה תת־חוגים', 'לוח סיבובי', 'צמיד פלדה עם אבזם פרפר'],
            en: ['Quartz movement', 'Three sub-dials', 'Rotating bezel', 'Steel bracelet with butterfly clasp']
        },
        specs: [
            { label: { he: 'קוטר', en: 'Case' }, value: { he: '42 מ״מ', en: '42 mm' } },
            { label: { he: 'עובי', en: 'Thickness' }, value: { he: '12 מ״מ', en: '12 mm' } },
            { label: { he: 'עמידות למים', en: 'Water resistance' }, value: { he: '3 ATM', en: '3 ATM' } },
            { label: { he: 'צמיד', en: 'Bracelet' }, value: { he: 'פלדת אל־חלד', en: 'Stainless steel' } }
        ],
        care: { he: 'לא להיכנס איתו למקלחת או לים', en: 'Not for showering or swimming' },
        stock: 4
    },
    {
        slug: 'quartz-watch',
        category: 'watches',
        name: { he: 'שעון לומן', en: 'Lumen Quartz' },
        subtitle: { he: 'לוח לבן, מארז זהב', en: 'White dial, gold case' },
        price: 320,
        compareAt: null,
        badge: null,
        colour: 'gold',
        image: '/shop/quartz.jpg',
        story: {
            he: 'שעון קטן ונקי: לוח לבן עם מחוגים דקים, מארז זהוב וצמיד חוליות צר. נועד להיות מונח על היד ולא להעיק עליה.',
            en: 'Small and clean: a white dial with slim hands, a gold case and a narrow link bracelet. Made to sit on the wrist without weighing on it.'
        },
        details: {
            he: ['מנגנון קוורץ', 'לוח לבן עם מחוגים דקים', 'צמיד חוליות צר', 'מארז בגימור זהוב'],
            en: ['Quartz movement', 'White dial with slim hands', 'Narrow link bracelet', 'Gold-finish case']
        },
        specs: [
            { label: { he: 'קוטר', en: 'Case' }, value: { he: '32 מ״מ', en: '32 mm' } },
            { label: { he: 'עובי', en: 'Thickness' }, value: { he: '8 מ״מ', en: '8 mm' } },
            { label: { he: 'עמידות למים', en: 'Water resistance' }, value: { he: 'התזות בלבד', en: 'Splashes only' } },
            { label: { he: 'צמיד', en: 'Bracelet' }, value: { he: 'פלדה בגימור זהוב', en: 'Gold-finish steel' } }
        ],
        care: { he: 'לנגב אחרי מגע עם בושם או קרם', en: 'Wipe after contact with perfume or cream' },
        stock: 9
    },
    {
        slug: 'lariat-necklace',
        category: 'jewellery',
        name: { he: 'שרשרת לירה', en: 'Lyra Lariat' },
        subtitle: { he: 'שתי שכבות, טפטוף קדמי', en: 'Two layers, a front drop' },
        price: 190,
        compareAt: null,
        badge: null,
        colour: 'silver',
        image: '/shop/necklace.jpg',
        story: {
            he: 'שתי שרשראות בגובה שונה: צ׳וקר קצר עם חרוזים, ומעליו שרשרת ארוכה שנופלת לטפטוף אחד באמצע. נעילה אחת לשתיהן.',
            en: 'Two chains at different heights: a short beaded choker with a longer chain over it that falls to a single drop. One clasp for both.'
        },
        details: {
            he: ['שתי שכבות בנעילה אחת', 'חרוזי כדור לאורך השרשרת', 'טפטוף קדמי', 'נעילת קפיץ'],
            en: ['Two layers on one clasp', 'Ball beads along the chain', 'Front drop', 'Spring clasp']
        },
        specs: [
            { label: { he: 'אורך עליון', en: 'Upper length' }, value: { he: '38 ס״מ', en: '38 cm' } },
            { label: { he: 'אורך תחתון', en: 'Lower length' }, value: { he: '52 ס״מ', en: '52 cm' } },
            { label: { he: 'טפטוף', en: 'Drop' }, value: { he: '9 ס״מ', en: '9 cm' } },
            { label: { he: 'גימור', en: 'Finish' }, value: { he: 'ציפוי כסף', en: 'Silver plate' } }
        ],
        care: { he: 'להסיר לפני מקלחת, לאחסן יבש', en: 'Remove before showering, store dry' },
        stock: 14
    },
    {
        slug: 'cuban-bracelet',
        category: 'jewellery',
        name: { he: 'צמיד קובני', en: 'Cuban Bracelet' },
        subtitle: { he: 'חוליות רחבות, פלדה', en: 'Wide links, steel' },
        price: 220,
        compareAt: 280,
        badge: null,
        colour: 'steel',
        image: '/shop/cuban.jpg',
        story: {
            he: 'חוליות קובניות רחבות בפלדת אל־חלד מלוטשת. כבד מספיק כדי להרגיש, לא כבד מספיק כדי להפריע.',
            en: 'Wide Cuban links in polished stainless steel. Heavy enough to feel, not heavy enough to get in the way.'
        },
        details: {
            he: ['פלדת אל־חלד 316L', 'חוליות ברוחב 8 מ״מ', 'נעילת קופסה', 'לא מחליד במים'],
            en: ['316L stainless steel', '8 mm links', 'Box clasp', 'Will not rust in water']
        },
        specs: [
            { label: { he: 'אורך', en: 'Length' }, value: { he: '21 ס״מ', en: '21 cm' } },
            { label: { he: 'רוחב', en: 'Width' }, value: { he: '8 מ״מ', en: '8 mm' } },
            { label: { he: 'חומר', en: 'Material' }, value: { he: 'פלדת אל־חלד', en: 'Stainless steel' } },
            { label: { he: 'נעילה', en: 'Clasp' }, value: { he: 'קופסה', en: 'Box' } }
        ],
        care: { he: 'אפשר לרחוץ במים, לייבש אחרי ים', en: 'Rinseable, dry after the sea' },
        stock: 11
    },
    {
        slug: 'tennis-bracelet',
        category: 'jewellery',
        name: { he: 'צמיד טניס', en: 'Tennis Bracelet' },
        subtitle: { he: 'שורת אבנים אחת', en: 'A single row of stones' },
        price: 280,
        compareAt: 360,
        badge: 'new',
        colour: 'silver',
        image: '/shop/tennis.jpg',
        story: {
            he: 'שורה אחת של אבני זירקוניה בשיבוץ ארבע שיניים, על שרשרת שמתעגלת סביב פרק היד. נעילת בטחון כפולה.',
            en: 'A single row of zirconia in four-prong settings on a chain that curves around the wrist. Double safety clasp.'
        },
        details: {
            he: ['אבני זירקוניה בשיבוץ ארבע שיניים', 'נעילת בטחון כפולה', 'ציפוי רודיום', 'מתעגל סביב פרק היד'],
            en: ['Four-prong zirconia settings', 'Double safety clasp', 'Rhodium plate', 'Curves with the wrist']
        },
        specs: [
            { label: { he: 'אורך', en: 'Length' }, value: { he: '18 ס״מ', en: '18 cm' } },
            { label: { he: 'רוחב', en: 'Width' }, value: { he: '3 מ״מ', en: '3 mm' } },
            { label: { he: 'אבנים', en: 'Stones' }, value: { he: 'זירקוניה', en: 'Cubic zirconia' } },
            { label: { he: 'גימור', en: 'Finish' }, value: { he: 'ציפוי רודיום', en: 'Rhodium plate' } }
        ],
        care: { he: 'לנקות במטלית רכה, בלי חומרי ניקוי', en: 'Clean with a soft cloth, no detergents' },
        stock: 7
    },
    {
        slug: 'corduroy-cap',
        category: 'caps',
        name: { he: 'כובע קורדרוי', en: 'Corduroy Cap' },
        subtitle: { he: 'מבנה חצי־קשיח, בלי לוגו', en: 'Half-structured, no logo' },
        price: 129,
        compareAt: null,
        badge: null,
        colour: 'ivory',
        image: '/shop/cap.jpg',
        story: {
            he: 'קורדרוי בגוון שנהב עם רקמת חתימה קטנה בחזית. מבנה חצי־קשיח שמחזיק צורה בלי להיראות חדש מדי.',
            en: 'Ivory corduroy with a small signature embroidery at the front. Half-structured, so it holds its shape without looking box-fresh.'
        },
        details: {
            he: ['קורדרוי כותנה', 'רקמת חתימה בחזית', 'רצועה אחורית מתכווננת', 'מבנה חצי־קשיח'],
            en: ['Cotton corduroy', 'Signature embroidery', 'Adjustable back strap', 'Half-structured crown']
        },
        specs: [
            { label: { he: 'היקף', en: 'Circumference' }, value: { he: '56–60 ס״מ', en: '56–60 cm' } },
            { label: { he: 'חומר', en: 'Material' }, value: { he: 'כותנה קורדרוי', en: 'Corduroy cotton' } },
            { label: { he: 'סגירה', en: 'Closure' }, value: { he: 'רצועה מתכווננת', en: 'Adjustable strap' } },
            { label: { he: 'מצחייה', en: 'Brim' }, value: { he: 'מעוקלת', en: 'Curved' } }
        ],
        care: { he: 'כביסת יד קרה, ייבוש על צורה', en: 'Cold hand wash, dry on a form' },
        stock: 15
    },
    {
        slug: 'hexa-black',
        category: 'eyewear',
        name: { he: 'הקסה שחור', en: 'Hexa Black' },
        subtitle: { he: 'משושה, עדשה כחולה מדורגת', en: 'Hexagonal, graduated blue lens' },
        price: 560,
        compareAt: 690,
        badge: 'new',
        colour: 'black',
        image: '/shop/sunglasses-black.jpg',
        story: {
            he: 'שש צלעות שמחדדות את עצמות הלחיים, עם מסמרת יהלום בקצה החזית. חזית שחורה מלוטשת ועדשה כחולה מדורגת.',
            en: 'Six sides that sharpen the cheekbones, finished with a diamond rivet at the browline. Polished black front, graduated blue lens.'
        },
        details: {
            he: ['חזית משושה מלוטשת', 'מסמרת יהלום בכל פינה', 'עדשות עם הגנת UV400', 'זרועות דקות'],
            en: ['Polished hexagonal front', 'Diamond rivet at each corner', 'UV400 protection', 'Slim temples']
        },
        specs: [
            { label: { he: 'רוחב עדשה', en: 'Lens width' }, value: { he: '48 מ״מ', en: '48 mm' } },
            { label: { he: 'גשר', en: 'Bridge' }, value: { he: '20 מ״מ', en: '20 mm' } },
            { label: { he: 'זרוע', en: 'Temple' }, value: { he: '142 מ״מ', en: '142 mm' } },
            { label: { he: 'משקל', en: 'Weight' }, value: { he: '26 גרם', en: '26 g' } }
        ],
        care: { he: 'לנקות במטלית מיקרופייבר, לאחסן בנרתיק', en: 'Clean with microfibre, store in the case' },
        stock: 8
    },
    {
        slug: 'hexa-tortoise',
        category: 'eyewear',
        name: { he: 'הקסה צב', en: 'Hexa Tortoise' },
        subtitle: { he: 'אותה גיאומטריה, שריון צב', en: 'Same geometry, tortoiseshell' },
        price: 560,
        compareAt: 690,
        badge: null,
        colour: 'tortoise',
        image: '/shop/sunglasses-tortoise.jpg',
        story: {
            he: 'אותן שש צלעות, הפעם בשריון צב עם עדשת ענבר. הדפוס משתנה מזוג לזוג, אז אין שתי מסגרות זהות.',
            en: 'The same six sides, this time in tortoiseshell with an amber lens. The pattern shifts from pair to pair, so no two frames are identical.'
        },
        details: {
            he: ['חזית משושה בשריון צב', 'מסמרת יהלום בכל פינה', 'עדשות ענבר UV400', 'זרועות דקות'],
            en: ['Hexagonal front in tortoiseshell', 'Diamond rivet at each corner', 'Amber UV400 lenses', 'Slim temples']
        },
        specs: [
            { label: { he: 'רוחב עדשה', en: 'Lens width' }, value: { he: '48 מ״מ', en: '48 mm' } },
            { label: { he: 'גשר', en: 'Bridge' }, value: { he: '20 מ״מ', en: '20 mm' } },
            { label: { he: 'זרוע', en: 'Temple' }, value: { he: '142 מ״מ', en: '142 mm' } },
            { label: { he: 'משקל', en: 'Weight' }, value: { he: '26 גרם', en: '26 g' } }
        ],
        care: { he: 'לנקות במטלית מיקרופייבר, לאחסן בנרתיק', en: 'Clean with microfibre, store in the case' },
        stock: 5
    }
];

export const getProduct = (slug) => products.find((p) => p.slug === slug);
export const productsIn = (category) => products.filter((p) => p.category === category);
export const inStock = (product) => (product?.stock ?? 0) > 0;
