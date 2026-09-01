// AYIN — brand catalogue.
// Prices are stored in ILS (agorot-free, whole shekels). USD is derived for the
// English storefront so a single source of truth stays in one place.

export const ILS_TO_USD = 1 / 3.6;

export const SHAPES = {
    square: { he: 'מרובע', en: 'Square' },
    round: { he: 'עגול', en: 'Round' },
    hexagon: { he: 'משושה', en: 'Hexagon' },
    rectangle: { he: 'מלבני', en: 'Rectangle' },
    oval: { he: 'אליפטי', en: 'Oval' },
    cat: { he: 'חתולי', en: 'Cat-eye' }
};

export const FACE_SHAPES = {
    oval: { he: 'אליפטי', en: 'Oval' },
    round: { he: 'עגול', en: 'Round' },
    square: { he: 'מרובע', en: 'Square' },
    heart: { he: 'לב', en: 'Heart' },
    long: { he: 'מוארך', en: 'Oblong' }
};

export const products = [
    {
        slug: 'aras',
        name: { he: 'אראס', en: 'Aras' },
        tagline: { he: 'נפח מלא, נוכחות מלאה', en: 'Full volume, full presence' },
        shape: 'square',
        collection: 'signature',
        price: 890,
        compareAt: 1090,
        badge: 'bestseller',
        rating: 4.9,
        reviews: 214,
        fits: ['oval', 'round', 'heart'],
        story: {
            he: 'המסגרת הכי נועזת בקולקציה. אצטט איטלקי בעובי 8 מ״מ, מלוטש ביד במשך שלושה ימים, עם זרוע פליז חרוטה בדוגמת חץ. אראס לא מנסה להיעלם על הפנים — היא באה להיראות.',
            en: 'The boldest frame in the collection. Eight millimetres of Italian acetate, hand-polished over three days, with an engraved brass arrow temple. Aras does not try to disappear on a face. It arrives.'
        },
        details: {
            he: [
                'אצטט מאזוצ׳י איטלקי, עובי 8 מ״מ',
                'זרוע פליז מוזהב עם חריטת חץ ידנית',
                'צירי טיטניום מוסתרים בשבעה ברגים',
                'עדשות פולארויד עם הגנת UV400'
            ],
            en: [
                'Italian Mazzucchelli acetate, 8mm profile',
                'Gold brass temple with hand-cut arrow engraving',
                'Concealed titanium hinges, seven-barrel',
                'Polarised lenses with UV400 protection'
            ]
        },
        specs: { lens: 52, bridge: 22, temple: 145, weight: 34 },
        variants: [
            {
                id: 'aras-onyx',
                color: { he: 'אוניקס', en: 'Onyx' },
                hex: '#151312',
                lens: { he: 'חום קלאסי', en: 'Classic Brown' },
                lensHex: '#6b4a2b',
                image: '/products/aras-onyx-1.jpg'
            },
            {
                id: 'aras-noir',
                color: { he: 'שחור מט', en: 'Matte Noir' },
                hex: '#0b0b0c',
                lens: { he: 'אפור עשן', en: 'Smoke Grey' },
                lensHex: '#3a3d40',
                image: '/products/aras-noir-1.jpg'
            }
        ]
    },
    {
        slug: 'hexa',
        name: { he: 'הקסה', en: 'Hexa' },
        tagline: { he: 'שש צלעות, אינסוף זוויות', en: 'Six sides, endless angles' },
        shape: 'hexagon',
        collection: 'signature',
        price: 740,
        compareAt: 890,
        badge: 'new',
        rating: 4.8,
        reviews: 168,
        fits: ['round', 'oval', 'long'],
        story: {
            he: 'הקסה נולדה מרישום גיאומטרי אחד שחזר על עצמו במחברת שלנו במשך חודשיים. שש צלעות שמחדדות את עצמות הלחיים, עם מסמרת יהלום בקצה החזית. חמישה גוונים, אותה גיאומטריה מדויקת.',
            en: 'Hexa began as a single geometric sketch that kept repeating in our notebook for two months. Six sides that sharpen the cheekbones, finished with a diamond rivet at the browline. Five colourways, one exact geometry.'
        },
        details: {
            he: [
                'חזית משושה מלוטשת בצילינדר במשך 48 שעות',
                'מסמרת יהלום מוטבעת ביד',
                'עדשות מדורגות עם ציפוי אנטי־רפלקטיבי',
                'משקל 26 גרם — כמעט לא מורגשת'
            ],
            en: [
                'Hexagonal front tumbled for 48 hours',
                'Hand-set diamond rivet at each corner',
                'Graduated lenses with anti-reflective coating',
                '26 grams — barely there'
            ]
        },
        specs: { lens: 48, bridge: 20, temple: 142, weight: 26 },
        variants: [
            {
                id: 'hexa-olive',
                color: { he: 'זית שקוף', en: 'Clear Olive' },
                hex: '#6f7a52',
                lens: { he: 'ירוק כהה', en: 'Deep Green' },
                lensHex: '#2f3a30',
                image: '/products/hexa-olive-1.jpg'
            },
            {
                id: 'hexa-amber',
                color: { he: 'שחור ענבר', en: 'Amber Noir' },
                hex: '#141414',
                lens: { he: 'ענבר', en: 'Amber' },
                lensHex: '#e0a95a',
                image: '/products/hexa-amber-1.jpg'
            },
            {
                id: 'hexa-azure',
                color: { he: 'שחור אזור', en: 'Azure Noir' },
                hex: '#101114',
                lens: { he: 'כחול מדורג', en: 'Graduated Azure' },
                lensHex: '#2f6fb5',
                image: '/products/hexa-azure-1.jpg'
            },
            {
                id: 'hexa-tortoise',
                color: { he: 'שריון צב', en: 'Tortoise' },
                hex: '#7a3f14',
                lens: { he: 'חום מדורג', en: 'Graduated Brown' },
                lensHex: '#8a5a3c',
                image: '/products/hexa-tortoise-1.jpg'
            },
            {
                id: 'hexa-smoke',
                color: { he: 'עשן שקוף', en: 'Smoke Fade' },
                hex: '#4a4a52',
                lens: { he: 'סגול מדורג', en: 'Graduated Violet' },
                lensHex: '#5b4a72',
                image: '/products/hexa-smoke-1.jpg'
            }
        ]
    },
    {
        slug: 'kelso',
        name: { he: 'קלסו', en: 'Kelso' },
        tagline: { he: 'העגול שמתאים כמעט לכולם', en: 'The round one that suits nearly everyone' },
        shape: 'round',
        collection: 'heritage',
        price: 620,
        compareAt: null,
        badge: null,
        rating: 4.7,
        reviews: 342,
        fits: ['square', 'heart', 'long'],
        story: {
            he: 'עיגול רך עם קצה שטוח קלות בתחתית — הפרט הקטן שהופך משקפיים עגולים ממשקפיים של פרופסור למשקפיים של מישהו שיודע מה הוא עושה. מעבר צבע מקרמל לשקוף שנוצר בליטוש ולא בצבע.',
            en: 'A soft circle with a barely flattened bottom edge — the small detail that turns a round frame from professorial into deliberate. The caramel-to-clear fade is cut into the acetate, not painted on.'
        },
        details: {
            he: [
                'מעבר צבע חתוך מתוך הבלוק, לא מודפס',
                'קצות זרועות מחוספסים לאחיזה',
                'עדשות חומות עם 100% חסימת UV',
                'כולל נרתיק קשיח ומטלית מיקרופייבר'
            ],
            en: [
                'Colour fade cut from the block, never printed',
                'Ridged temple tips for grip',
                'Brown lenses with 100% UV block',
                'Hard case and microfibre cloth included'
            ]
        },
        specs: { lens: 49, bridge: 21, temple: 145, weight: 28 },
        variants: [
            {
                id: 'kelso-amber',
                color: { he: 'קרמל מדורג', en: 'Caramel Fade' },
                hex: '#7c4a2a',
                lens: { he: 'חום', en: 'Brown' },
                lensHex: '#6f4526',
                image: '/products/kelso-amber-1.jpg'
            }
        ]
    },
    {
        slug: 'marlow',
        name: { he: 'מארלו', en: 'Marlow' },
        tagline: { he: 'שחור. סוף דיון.', en: 'Black. End of discussion.' },
        shape: 'round',
        collection: 'heritage',
        price: 650,
        compareAt: 780,
        badge: 'bestseller',
        rating: 4.9,
        reviews: 401,
        fits: ['square', 'heart', 'oval'],
        story: {
            he: 'המסגרת שאנחנו הכי הרבה שולחים חזרה ללקוחות ששכחו אותה במונית. שחור מלוטש עמוק, שלוש מסמרות כסף בכל צד, וקו גבה ישר שמייצב את כל הפנים.',
            en: 'The frame we most often ship back to customers who left it in a taxi. Deep polished black, three silver rivets per side, and a straight browline that steadies the whole face.'
        },
        details: {
            he: [
                'שלוש מסמרות כסף סטרלינג בכל צד',
                'ליטוש שחור עמוק בשמונה שלבים',
                'עדשות אפורות מקוטבות',
                'מתאים גם למספר אופטי'
            ],
            en: [
                'Three sterling silver rivets per side',
                'Eight-stage deep black polish',
                'Polarised grey lenses',
                'Prescription-ready'
            ]
        },
        specs: { lens: 50, bridge: 22, temple: 148, weight: 30 },
        variants: [
            {
                id: 'marlow-black',
                color: { he: 'שחור מלוטש', en: 'Polished Black' },
                hex: '#0d0d0f',
                lens: { he: 'אפור', en: 'Grey' },
                lensHex: '#4a4d52',
                image: '/products/marlow-black-1.jpg'
            }
        ]
    },
    {
        slug: 'sage',
        name: { he: 'סייג׳', en: 'Sage' },
        tagline: { he: 'ירוק שנראה כמו אור', en: 'A green that reads as light' },
        shape: 'round',
        collection: 'heritage',
        price: 680,
        compareAt: null,
        badge: null,
        rating: 4.8,
        reviews: 96,
        fits: ['square', 'oval', 'heart'],
        story: {
            he: 'אצטט ירוק שקוף שמשנה גוון לפי שעת היום — צהוב־זית בבוקר, כמעט אפור בשקיעה. עדשות מדורגות חום שמשאירות את העיניים גלויות למי שמסתכל.',
            en: 'A translucent green acetate that shifts through the day — olive at noon, almost grey at dusk. Graduated brown lenses keep the eyes visible to whoever is looking.'
        },
        details: {
            he: [
                'אצטט שקוף בגוון זית עם ליבה זהובה',
                'זרועות עם ליבת מתכת מחוזקת',
                'עדשות מדורגות חום־שקוף',
                'ייצור מוגבל של 300 יחידות'
            ],
            en: [
                'Translucent olive acetate with a gold core',
                'Wire-core reinforced temples',
                'Brown-to-clear graduated lenses',
                'Limited run of 300 pieces'
            ]
        },
        specs: { lens: 49, bridge: 21, temple: 146, weight: 29 },
        variants: [
            {
                id: 'sage-olive',
                color: { he: 'זית', en: 'Olive' },
                hex: '#7d8a5c',
                lens: { he: 'חום מדורג', en: 'Graduated Brown' },
                lensHex: '#7b5a3a',
                image: '/products/sage-olive-1.jpg'
            }
        ]
    },
    {
        slug: 'vela',
        name: { he: 'ולה', en: 'Vela' },
        tagline: { he: 'קטן, חד, בלתי נשכח', en: 'Small, sharp, unforgettable' },
        shape: 'oval',
        collection: 'sun',
        price: 560,
        compareAt: 690,
        badge: 'new',
        rating: 4.6,
        reviews: 78,
        fits: ['round', 'square', 'long'],
        story: {
            he: 'הפרופיל הצר ביותר שלנו. שריון צב חם עם עדשות דבש שמחממות כל תמונה שתצלמו איתן. נבנתה למי שאוהב שהמשקפיים ייגמרו בדיוק במקום שבו הפנים מתחילות.',
            en: 'Our narrowest profile. Warm tortoise with honey lenses that heat up every photo you take in them. Built for anyone who wants the frame to stop exactly where the face begins.'
        },
        details: {
            he: [
                'שריון צב איטלקי בדוגמה ייחודית לכל יחידה',
                'מסמרות כפולות בפינות',
                'עדשות דבש עם ציפוי אנטי־שריטות',
                'משקל 24 גרם'
            ],
            en: [
                'Italian tortoise — no two patterns identical',
                'Double rivets at the corners',
                'Honey lenses with scratch-resistant coating',
                '24 grams'
            ]
        },
        specs: { lens: 47, bridge: 20, temple: 142, weight: 24 },
        variants: [
            {
                id: 'vela-yellow',
                color: { he: 'שריון צב', en: 'Tortoise' },
                hex: '#8a4a16',
                lens: { he: 'דבש', en: 'Honey' },
                lensHex: '#e2942a',
                image: '/products/vela-yellow-1.jpg'
            }
        ]
    },
    {
        slug: 'rhys',
        name: { he: 'ריס', en: 'Rhys' },
        tagline: { he: 'שריון צב עם שמיים בפנים', en: 'Tortoise with a sky inside' },
        shape: 'rectangle',
        collection: 'sun',
        price: 590,
        compareAt: null,
        badge: null,
        rating: 4.7,
        reviews: 112,
        fits: ['round', 'oval', 'heart'],
        story: {
            he: 'מלבן נמוך ורחב עם עדשות כחולות מדורגות שמתבהרות לכיוון התחתית. הצירים חשופים בכוונה — שני ברגי כסף שמזכירים שמישהו הרכיב את זה ביד.',
            en: 'A low, wide rectangle with graduated blue lenses that lighten toward the bottom. The hinges are exposed on purpose — two silver pins reminding you a person assembled this.'
        },
        details: {
            he: [
                'עדשות כחולות מדורגות בקטגוריה 2',
                'צירי כסף חשופים',
                'זרועות דקות עם קצה שקוף',
                'גשר נמוך — מתאים גם לאף נמוך'
            ],
            en: [
                'Category 2 graduated blue lenses',
                'Exposed silver hinges',
                'Slim temples with clear tips',
                'Low bridge — works for low nose bridges'
            ]
        },
        specs: { lens: 51, bridge: 19, temple: 143, weight: 25 },
        variants: [
            {
                id: 'rhys-azure',
                color: { he: 'שריון צב', en: 'Tortoise' },
                hex: '#5e2d10',
                lens: { he: 'תכלת מדורג', en: 'Graduated Azure' },
                lensHex: '#6fa8dc',
                image: '/products/rhys-azure-1.jpg'
            }
        ]
    },
    {
        slug: 'kira',
        name: { he: 'קירה', en: 'Kira' },
        tagline: { he: 'חתולי, אבל בשקט', en: 'Cat-eye, quietly' },
        shape: 'cat',
        collection: 'sun',
        price: 540,
        compareAt: 650,
        badge: null,
        rating: 4.8,
        reviews: 187,
        fits: ['round', 'square', 'oval'],
        story: {
            he: 'זווית חתולית מרומזת בלבד, כי לא כל אמירה צריכה להיצעק. הדפס מנומר בגוונים חמים ומסמרת פליז עגולה על הציר — הפרט היחיד שמבריק.',
            en: 'A cat-eye angle that only hints at itself, because not every statement needs volume. Warm leopard print with a single round brass rivet at the hinge — the only thing that shines.'
        },
        details: {
            he: [
                'הדפס מנומר חתוך מבלוק אצטט',
                'מסמרת פליז עגולה',
                'עדשות חומות אחידות',
                'הכי קלה בקולקציה — 22 גרם'
            ],
            en: [
                'Leopard pattern cut from the acetate block',
                'Round brass rivet',
                'Solid brown lenses',
                'Lightest in the collection — 22 grams'
            ]
        },
        specs: { lens: 46, bridge: 19, temple: 140, weight: 22 },
        variants: [
            {
                id: 'kira-leopard',
                color: { he: 'מנומר', en: 'Leopard' },
                hex: '#a5561f',
                lens: { he: 'חום', en: 'Brown' },
                lensHex: '#6b4626',
                image: '/products/kira-leopard-1.jpg'
            }
        ]
    },
    {
        slug: 'nova',
        name: { he: 'נובה', en: 'Nova' },
        tagline: { he: 'כוכב אחד בכל צד', en: 'One star on each side' },
        shape: 'rectangle',
        collection: 'signature',
        price: 610,
        compareAt: null,
        badge: null,
        rating: 4.7,
        reviews: 143,
        fits: ['round', 'oval', 'heart'],
        story: {
            he: 'מלבן קלאסי עם פרט אחד שגורם לאנשים לשאול: מסמרת כוכב מתכתית בקצה החזית. שתי אפשרויות עדשה — חום קלאסי או ירוק בקבוק שנראה כמו משקפי נהיגה של שנות השבעים.',
            en: 'A classic rectangle with one detail that makes people ask: a metal star rivet at the browline. Two lens options — classic brown, or a bottle green that reads like 1970s driving glasses.'
        },
        details: {
            he: [
                'מסמרת כוכב מתכתית מוטבעת',
                'שריון צב עם ניגודיות גבוהה',
                'שתי אפשרויות עדשה',
                'צירי קפיץ לנוחות לאורך היום'
            ],
            en: [
                'Inlaid metal star rivet',
                'High-contrast tortoise acetate',
                'Two lens options',
                'Sprung hinges for all-day wear'
            ]
        },
        specs: { lens: 50, bridge: 20, temple: 144, weight: 27 },
        variants: [
            {
                id: 'nova-tortoise',
                color: { he: 'שריון צב', en: 'Tortoise' },
                hex: '#77380f',
                lens: { he: 'חום', en: 'Brown' },
                lensHex: '#70481f',
                image: '/products/nova-tortoise-1.jpg'
            },
            {
                id: 'nova-forest',
                color: { he: 'שריון צב כהה', en: 'Dark Tortoise' },
                hex: '#5b2c0d',
                lens: { he: 'ירוק בקבוק', en: 'Bottle Green' },
                lensHex: '#3c4a3c',
                image: '/products/nova-forest-1.jpg'
            }
        ]
    },
    {
        slug: 'otto',
        name: { he: 'אוטו', en: 'Otto' },
        tagline: { he: 'שחור עם עדשת שקיעה', en: 'Black with a sunset lens' },
        shape: 'square',
        collection: 'sun',
        price: 640,
        compareAt: 760,
        badge: 'new',
        rating: 4.8,
        reviews: 89,
        fits: ['oval', 'round', 'long'],
        story: {
            he: 'מסגרת שחורה עם עדשות כתומות שמשנות את הצבע של כל מה שאתם רואים — הכביש נהיה חם, השמיים נהיים ברונזה. שני פסי פליז דקים בצדדים הם החתימה.',
            en: 'A black frame with orange lenses that re-grade everything you look at — the road warms, the sky turns bronze. Two thin brass bars on the sides are the signature.'
        },
        details: {
            he: [
                'שני פסי פליז משובצים בחזית',
                'עדשות כתומות בקטגוריה 2',
                'משפר ניגודיות לנהיגה ביום מעונן',
                'מסגרת מרובעת עם פינות מעוגלות'
            ],
            en: [
                'Two inlaid brass bars on the front',
                'Category 2 orange lenses',
                'Contrast-enhancing for overcast driving',
                'Square frame, softened corners'
            ]
        },
        specs: { lens: 50, bridge: 21, temple: 144, weight: 26 },
        variants: [
            {
                id: 'otto-amber',
                color: { he: 'שחור', en: 'Black' },
                hex: '#111113',
                lens: { he: 'ענבר בוער', en: 'Burnt Amber' },
                lensHex: '#c9631c',
                image: '/products/otto-amber-1.jpg'
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

export function findVariant(variantId) {
    for (const product of products) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant) return { product, variant };
    }
    return null;
}

export const allVariants = products.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })));
