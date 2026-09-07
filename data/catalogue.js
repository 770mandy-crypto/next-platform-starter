// AYIN — brand catalogue.
//
// BEFORE LAUNCH: prices, measurements and the copy below are placeholders
// written to shape the layout. Replace them with the real figures for each
// product. Nothing here should be published as fact until you have verified it.

export const ILS_TO_USD = 1 / 3.6;

/** Every category gets its own landing page at /category/<key>. */
export const CATEGORIES = {
    eyewear: {
        name: { he: 'משקפיים', en: 'Eyewear' },
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
            en: 'Chains and bracelets that sit on skin without demanding attention.'
        }
    },
    bags: {
        name: { he: 'תיקים', en: 'Bags' },
        lead: {
            he: 'גודל שמכיל את מה שצריך ותו לא.',
            en: 'Sized for what you actually carry, and nothing else.'
        }
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
        lead: {
            he: 'מבנה טוב, בלי לוגו שצועק.',
            en: 'Good structure, no shouting logo.'
        }
    }
};

/** Face shapes, used by the eyewear fit finder. */
export const FACE_SHAPES = {
    oval: { he: 'אליפטי', en: 'Oval' },
    round: { he: 'עגול', en: 'Round' },
    square: { he: 'מרובע', en: 'Square' },
    heart: { he: 'לב', en: 'Heart' },
    long: { he: 'מוארך', en: 'Oblong' }
};

export const SHAPES = {
    square: { he: 'מרובע', en: 'Square' },
    round: { he: 'עגול', en: 'Round' },
    hexagon: { he: 'משושה', en: 'Hexagon' },
    rectangle: { he: 'מלבני', en: 'Rectangle' },
    oval: { he: 'אליפטי', en: 'Oval' },
    cat: { he: 'חתולי', en: 'Cat-eye' }
};

export const products = [
    // ---------------------------------------------------------------- wallets
    {
        slug: 'vault',
        category: 'wallets',
        name: { he: 'וולט', en: 'Vault' },
        tagline: { he: 'לחיצה אחת, הכרטיסים בחוץ', en: 'One press, cards out' },
        price: 249,
        compareAt: 329,
        badge: 'bestseller',
        story: {
            he: 'ארנק בגודל כיס קדמי עם מנגנון דחיפה: מזיזים את הלשונית בצד והכרטיסים נפרשים כמו מניפה, מוכנים לשליפה. תא שטרות, חלון לתעודה, וכיס רוכסן למטבעות בגב.',
            en: 'A front-pocket wallet with a push mechanism: slide the tab and the cards fan out ready to pull. Note compartment, ID window, and a zip coin pocket on the back.'
        },
        details: {
            he: [
                'מנגנון דחיפה לשליפת עד 6 כרטיסים',
                'בידוד RFID לשכבת הכרטיסים',
                'חלון שקוף לתעודה מזהה',
                'כיס רוכסן למטבעות ותא לשטרות'
            ],
            en: [
                'Push mechanism releases up to 6 cards',
                'RFID-blocking card housing',
                'Clear ID window',
                'Zip coin pocket and note compartment'
            ]
        },
        specs: [
            { label: { he: 'כרטיסים', en: 'Cards' }, value: { he: 'עד 6 במנגנון', en: 'Up to 6 in the slider' } },
            { label: { he: 'מידות', en: 'Size' }, value: { he: '10.5 × 8 × 2 ס״מ', en: '10.5 × 8 × 2 cm' } },
            { label: { he: 'חומר', en: 'Material' }, value: { he: 'עור סינתטי + אלומיניום', en: 'Synthetic leather + aluminium' } },
            { label: { he: 'משקל', en: 'Weight' }, value: { he: '95 גרם', en: '95 g' } }
        ],
        variants: [
            {
                id: 'vault-carbon',
                color: { he: 'קרבון שחור', en: 'Carbon Black' },
                hex: '#141416',
                accent: { he: 'כתום', en: 'Orange' },
                accentHex: '#c9631c',
                image: '/products/vault-carbon-1.jpg'
            }
        ]
    },

    // ------------------------------------------------------------------- bags
    {
        slug: 'vesper',
        category: 'bags',
        name: { he: 'וספר', en: 'Vesper' },
        tagline: { he: 'תיק כתף שיושב מתחת לזרוע', en: 'A shoulder bag that tucks under the arm' },
        price: 389,
        compareAt: null,
        badge: 'new',
        story: {
            he: 'צורת סהר רכה עם רצועת שרשרת מוזהבת וכתפייה מרופדת. נכנס טלפון, ארנק, מפתחות ומשקפיים — ונעצר שם, וזה בדיוק העניין.',
            en: 'A soft crescent with a gold chain strap and a padded shoulder pad. Fits a phone, a wallet, keys and sunglasses, and stops there, which is the point.'
        },
        details: {
            he: [
                'רצועת שרשרת מוזהבת עם כתפייה מרופדת',
                'סגירת רוכסן לאורך הפתח',
                'תא פנימי אחד לחפצים קטנים',
                'מרקם גרגירי שלא מראה שריטות'
            ],
            en: [
                'Gold chain strap with a padded shoulder pad',
                'Full-length zip closure',
                'One interior slip pocket',
                'Pebbled texture that hides scuffs'
            ]
        },
        specs: [
            { label: { he: 'מידות', en: 'Size' }, value: { he: '28 × 15 × 7 ס״מ', en: '28 × 15 × 7 cm' } },
            { label: { he: 'רצועה', en: 'Strap' }, value: { he: 'שרשרת, נפילה 22 ס״מ', en: 'Chain, 22 cm drop' } },
            { label: { he: 'סגירה', en: 'Closure' }, value: { he: 'רוכסן', en: 'Zip' } },
            { label: { he: 'חומר', en: 'Material' }, value: { he: 'עור סינתטי גרגירי', en: 'Pebbled synthetic leather' } }
        ],
        variants: [
            {
                id: 'vesper-taupe',
                color: { he: 'טאופ', en: 'Taupe' },
                hex: '#6b5a51',
                accent: { he: 'זהב', en: 'Gold' },
                accentHex: '#c9a24a',
                image: '/products/vesper-taupe-1.jpg'
            }
        ]
    },

    // ---------------------------------------------------------------- watches
    {
        slug: 'sovereign',
        category: 'watches',
        name: { he: 'סוברן', en: 'Sovereign' },
        tagline: { he: 'שעון שלא מתבייש', en: 'A watch with no shy setting' },
        price: 690,
        compareAt: 890,
        badge: 'bestseller',
        story: {
            he: 'תיבה בגוון רוז־גולד עם לוח שחור, שלושה תת־חוגים וחלון פאזות ירח. צמיד משולב זהב וכסף, ובזל מחורץ שנותן אחיזה. שעון שנראה גדול על היד ומתכוון לכך.',
            en: 'A rose-gold case over a black dial with three sub-dials and a moon-phase window. Two-tone bracelet, knurled bezel for grip. It reads large on the wrist and means to.'
        },
        details: {
            he: [
                'לוח שחור עם שלושה תת־חוגים וחלון פאזות ירח',
                'בזל מחורץ בגוון רוז־גולד',
                'צמיד מתכת משולב, חוליות ניתנות להסרה',
                'מנגנון קוורץ'
            ],
            en: [
                'Black dial with three sub-dials and a moon-phase window',
                'Knurled rose-gold bezel',
                'Two-tone metal bracelet with removable links',
                'Quartz movement'
            ]
        },
        specs: [
            { label: { he: 'קוטר תיבה', en: 'Case' }, value: { he: '42 מ״מ', en: '42 mm' } },
            { label: { he: 'מנגנון', en: 'Movement' }, value: { he: 'קוורץ', en: 'Quartz' } },
            { label: { he: 'עמידות למים', en: 'Water resistance' }, value: { he: '3 ATM — התזות', en: '3 ATM — splashes' } },
            { label: { he: 'צמיד', en: 'Bracelet' }, value: { he: 'פלדת אל־חלד', en: 'Stainless steel' } }
        ],
        variants: [
            {
                id: 'sovereign-rose',
                color: { he: 'רוז־גולד', en: 'Rose Gold' },
                hex: '#b76e53',
                accent: { he: 'לוח שחור', en: 'Black dial' },
                accentHex: '#151515',
                image: '/products/sovereign-rose-1.jpg'
            }
        ]
    },
    {
        slug: 'lumen',
        category: 'watches',
        name: { he: 'לומן', en: 'Lumen' },
        tagline: { he: 'הכי פחות שצריך, בזהב', en: 'The least you need, in gold' },
        price: 320,
        compareAt: null,
        badge: null,
        story: {
            he: 'תיבה עגולה קטנה, לוח לבן, מחוונים דקים ובלי שום דבר מיותר. שעון שנועד להשלים צמיד, לא להתחרות בו.',
            en: 'A small round case, a white dial, thin markers, and nothing else. Built to finish a stack of bracelets rather than compete with them.'
        },
        details: {
            he: [
                'לוח לבן עם מחוונים דקים',
                'תיבה וצמיד בגוון זהב אחיד',
                'אבזם פרפר מוסתר',
                'מנגנון קוורץ'
            ],
            en: [
                'White dial with slim markers',
                'Matching gold-tone case and bracelet',
                'Hidden butterfly clasp',
                'Quartz movement'
            ]
        },
        specs: [
            { label: { he: 'קוטר תיבה', en: 'Case' }, value: { he: '32 מ״מ', en: '32 mm' } },
            { label: { he: 'מנגנון', en: 'Movement' }, value: { he: 'קוורץ', en: 'Quartz' } },
            { label: { he: 'עמידות למים', en: 'Water resistance' }, value: { he: '3 ATM — התזות', en: '3 ATM — splashes' } },
            { label: { he: 'צמיד', en: 'Bracelet' }, value: { he: 'פלדה בציפוי זהב', en: 'Gold-plated steel' } }
        ],
        variants: [
            {
                id: 'lumen-gold',
                color: { he: 'זהב', en: 'Gold' },
                hex: '#c9a24a',
                accent: { he: 'לוח לבן', en: 'White dial' },
                accentHex: '#f2efe9',
                image: '/products/lumen-gold-1.jpg'
            }
        ]
    },

    // ------------------------------------------------------------- jewellery
    {
        slug: 'cuban',
        category: 'jewellery',
        name: { he: 'קובן', en: 'Cuban' },
        tagline: { he: 'חוליות שטוחות, ברק כפול', en: 'Flat links, double shine' },
        price: 220,
        compareAt: 280,
        badge: null,
        story: {
            he: 'צמיד חוליות קובני בפלדת אל־חלד, מלוטש לשני מישורים כך שכל חוליה תופסת אור אחרת. רוחב 8 מ״מ — מורגש על היד בלי להיות כבד.',
            en: 'A Cuban-link bracelet in stainless steel, polished on two planes so each link catches the light differently. Eight millimetres wide: present on the wrist without being heavy.'
        },
        details: {
            he: [
                'פלדת אל־חלד 316L — לא מחליד ולא משחיר',
                'ליטוש דו־מישורי לכל חוליה',
                'אבזם קופסה עם נעילה כפולה',
                'עמיד במים ובזיעה'
            ],
            en: [
                '316L stainless steel — will not rust or tarnish',
                'Two-plane polish on every link',
                'Box clasp with a double lock',
                'Water and sweat resistant'
            ]
        },
        specs: [
            { label: { he: 'רוחב', en: 'Width' }, value: { he: '8 מ״מ', en: '8 mm' } },
            { label: { he: 'אורך', en: 'Length' }, value: { he: '21 ס״מ', en: '21 cm' } },
            { label: { he: 'חומר', en: 'Material' }, value: { he: 'פלדת אל־חלד 316L', en: '316L stainless steel' } },
            { label: { he: 'אבזם', en: 'Clasp' }, value: { he: 'קופסה עם נעילה כפולה', en: 'Double-lock box clasp' } }
        ],
        variants: [
            {
                id: 'cuban-steel',
                color: { he: 'פלדה', en: 'Steel' },
                hex: '#9aa0a6',
                accent: { he: 'מלוטש', en: 'Polished' },
                accentHex: '#d8dce0',
                image: '/products/cuban-steel-1.jpg'
            }
        ]
    },
    {
        slug: 'tennis',
        category: 'jewellery',
        name: { he: 'טניס', en: 'Tennis' },
        tagline: { he: 'קו אחד של אור', en: 'A single line of light' },
        price: 280,
        compareAt: 360,
        badge: 'new',
        story: {
            he: 'שורה רציפה של אבני זירקוניה בשיבוץ ארבע שיניים, כל אחת בתושבת נפרדת כך שהצמיד נשאר גמיש ונופל סביב פרק היד. אבזם מתקפל עם נעילת ביטחון.',
            en: 'A continuous row of cubic zirconia in four-prong settings, each stone in its own housing so the bracelet stays fluid and follows the wrist. Folding clasp with a safety catch.'
        },
        details: {
            he: [
                'אבני זירקוניה בשיבוץ ארבע שיניים',
                'כל אבן בתושבת נפרדת — הצמיד נשאר גמיש',
                'אבזם מתקפל עם נעילת ביטחון',
                'ציפוי רודיום על פליז'
            ],
            en: [
                'Cubic zirconia in four-prong settings',
                'Each stone housed separately, so the bracelet stays fluid',
                'Folding clasp with a safety catch',
                'Rhodium plating over brass'
            ]
        },
        specs: [
            { label: { he: 'רוחב', en: 'Width' }, value: { he: '3 מ״מ', en: '3 mm' } },
            { label: { he: 'אורך', en: 'Length' }, value: { he: '18 ס״מ', en: '18 cm' } },
            { label: { he: 'אבנים', en: 'Stones' }, value: { he: 'זירקוניה מעוקבת', en: 'Cubic zirconia' } },
            { label: { he: 'ציפוי', en: 'Plating' }, value: { he: 'רודיום', en: 'Rhodium' } }
        ],
        variants: [
            {
                id: 'tennis-silver',
                color: { he: 'כסף', en: 'Silver' },
                hex: '#b9bec4',
                accent: { he: 'אבנים שקופות', en: 'Clear stones' },
                accentHex: '#eef1f4',
                image: '/products/tennis-silver-1.jpg'
            }
        ]
    },
    {
        slug: 'lyra',
        category: 'jewellery',
        name: { he: 'לירה', en: 'Lyra' },
        tagline: { he: 'שתי שכבות, נפילה אחת', en: 'Two layers, one drop' },
        price: 190,
        compareAt: null,
        badge: null,
        story: {
            he: 'שרשרת דו־שכבתית: צ׳וקר קצר על הצוואר ומעליו שרשרת ארוכה שנפתחת לנפילת Y. חרוזים קטנים לאורך השרשרת שוברים את האור בכל תנועה.',
            en: 'A two-layer necklace: a short choker at the throat with a longer chain over it that opens into a Y drop. Small beads along the chain break the light as you move.'
        },
        details: {
            he: [
                'שתי שכבות במחבר אחד — לא מסתבכות',
                'חרוזים קטנים לאורך השרשרת',
                'סוגר טבעת קפיץ עם שרשרת הארכה',
                'ציפוי כסף על פליז'
            ],
            en: [
                'Two layers on one connector, so they cannot tangle',
                'Small beads set along the chain',
                'Spring-ring clasp with an extender',
                'Silver plating over brass'
            ]
        },
        specs: [
            { label: { he: 'שכבה עליונה', en: 'Upper layer' }, value: { he: '36 ס״מ', en: '36 cm' } },
            { label: { he: 'שכבה תחתונה', en: 'Lower layer' }, value: { he: '55 ס״מ + נפילה', en: '55 cm plus drop' } },
            { label: { he: 'הארכה', en: 'Extender' }, value: { he: '6 ס״מ', en: '6 cm' } },
            { label: { he: 'ציפוי', en: 'Plating' }, value: { he: 'כסף', en: 'Silver' } }
        ],
        variants: [
            {
                id: 'lyra-silver',
                color: { he: 'כסף', en: 'Silver' },
                hex: '#c2c7cc',
                accent: { he: 'חרוזים', en: 'Beaded' },
                accentHex: '#e8ebee',
                image: '/products/lyra-silver-1.jpg'
            }
        ]
    },

    // ------------------------------------------------------------------ caps
    {
        slug: 'cord',
        category: 'caps',
        name: { he: 'קורד', en: 'Cord' },
        tagline: { he: 'קורדרוי, בלי לוגו', en: 'Corduroy, no logo' },
        price: 129,
        compareAt: null,
        badge: null,
        story: {
            he: 'כובע מצחייה מקורדרוי בגוון שנהב, עם רקמת חתימה קטנה בחזית ותו לא. מבנה חצי־קשיח שמחזיק צורה בלי להיראות חדש מדי.',
            en: 'An ivory corduroy cap with one small script embroidery on the front and nothing else. A half-structured crown that holds shape without looking box-fresh.'
        },
        details: {
            he: [
                'קורדרוי כותנה עם צלעות רחבות',
                'רקמת חתימה קטנה בחזית',
                'מבנה חצי־קשיח',
                'רצועה אחורית מתכווננת'
            ],
            en: [
                'Wide-wale cotton corduroy',
                'Small script embroidery on the front',
                'Half-structured crown',
                'Adjustable back strap'
            ]
        },
        specs: [
            { label: { he: 'היקף', en: 'Circumference' }, value: { he: '56–60 ס״מ', en: '56–60 cm' } },
            { label: { he: 'חומר', en: 'Material' }, value: { he: 'כותנה קורדרוי', en: 'Cotton corduroy' } },
            { label: { he: 'סגירה', en: 'Closure' }, value: { he: 'רצועה מתכווננת', en: 'Adjustable strap' } },
            { label: { he: 'מצחייה', en: 'Brim' }, value: { he: 'מעוקלת', en: 'Curved' } }
        ],
        variants: [
            {
                id: 'cord-ivory',
                color: { he: 'שנהב', en: 'Ivory' },
                hex: '#e8e4dc',
                accent: { he: 'רקמה שחורה', en: 'Black embroidery' },
                accentHex: '#1a1a1a',
                image: '/products/cord-ivory-1.jpg'
            }
        ]
    },

    // --------------------------------------------------------------- eyewear
    {
        slug: 'hexa',
        category: 'eyewear',
        name: { he: 'הקסה', en: 'Hexa' },
        tagline: { he: 'שש צלעות, אינסוף זוויות', en: 'Six sides, endless angles' },
        price: 560,
        compareAt: 690,
        badge: 'new',
        story: {
            he: 'שש צלעות שמחדדות את עצמות הלחיים, עם מסמרת יהלום בקצה החזית. שני גוונים, אותה גיאומטריה.',
            en: 'Six sides that sharpen the cheekbones, finished with a diamond rivet at the browline. Two colourways, one geometry.'
        },
        details: {
            he: [
                'חזית משושה מלוטשת',
                'מסמרת יהלום בכל פינה',
                'עדשות עם הגנת UV400',
                'זרועות דקות עם קצה מחוספס'
            ],
            en: [
                'Polished hexagonal front',
                'Diamond rivet at each corner',
                'UV400 protection',
                'Slim temples with ridged tips'
            ]
        },
        specs: [
            { label: { he: 'רוחב עדשה', en: 'Lens width' }, value: { he: '48 מ״מ', en: '48 mm' } },
            { label: { he: 'גשר', en: 'Bridge' }, value: { he: '20 מ״מ', en: '20 mm' } },
            { label: { he: 'זרוע', en: 'Temple' }, value: { he: '142 מ״מ', en: '142 mm' } },
            { label: { he: 'משקל', en: 'Weight' }, value: { he: '26 גרם', en: '26 g' } }
        ],
        // Eyewear-only geometry, used by the fit finder and the camera try-on.
        frame: { shape: 'hexagon', lens: 48, bridge: 20, temple: 142, weight: 26, fits: ['round', 'oval', 'long'] },
        variants: [
            {
                id: 'hexa-noir',
                color: { he: 'שחור', en: 'Noir' },
                hex: '#101114',
                accent: { he: 'כחול מדורג', en: 'Graduated Azure' },
                accentHex: '#2f6fb5',
                lensHex: '#2f6fb5',
                image: '/products/hexa-noir-1.jpg'
            },
            {
                id: 'hexa-tortoise',
                color: { he: 'שריון צב', en: 'Tortoise' },
                hex: '#7a3f14',
                accent: { he: 'ענבר', en: 'Amber' },
                accentHex: '#d9a86c',
                lensHex: '#d9a86c',
                image: '/products/hexa-tortoise-1.jpg'
            }
        ]
    }
];

export const LENS_UPGRADES = [
    { id: 'standard', price: 0, label: { he: 'עדשות מקוריות', en: 'Original lenses' } },
    { id: 'polarised', price: 180, label: { he: 'שדרוג לפולארויד', en: 'Polarised upgrade' } },
    { id: 'prescription', price: 340, label: { he: 'עדשות במספר אופטי', en: 'Prescription lenses' } },
    { id: 'blue', price: 140, label: { he: 'סינון אור כחול', en: 'Blue-light filter' } }
];

export function getProduct(slug) {
    return products.find((p) => p.slug === slug);
}

export function productsIn(category) {
    return products.filter((p) => p.category === category);
}

export function findVariant(variantId) {
    for (const product of products) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant) return { product, variant };
    }
    return null;
}

export const allVariants = products.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })));

/** Every colourway used across the catalogue, for the collection filters. */
export const COLOUR_FAMILIES = {
    black: { he: 'שחור', en: 'Black', hex: '#141416', match: (v) => ['#141416', '#101114', '#1a1a1a'].includes(v.hex) },
    silver: { he: 'כסף', en: 'Silver', hex: '#b9bec4', match: (v) => ['#9aa0a6', '#b9bec4', '#c2c7cc'].includes(v.hex) },
    gold: { he: 'זהב', en: 'Gold', hex: '#c9a24a', match: (v) => ['#c9a24a', '#b76e53'].includes(v.hex) },
    brown: { he: 'חום', en: 'Brown', hex: '#6b5a51', match: (v) => ['#6b5a51', '#7a3f14'].includes(v.hex) },
    ivory: { he: 'שנהב', en: 'Ivory', hex: '#e8e4dc', match: (v) => ['#e8e4dc'].includes(v.hex) }
};
