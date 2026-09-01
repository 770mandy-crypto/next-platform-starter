export const LANGS = ['he', 'en'];

export const CURRENCY = {
    he: { symbol: '₪', rate: 1, position: 'suffix' },
    en: { symbol: '$', rate: 1 / 3.6, position: 'prefix' }
};

export function formatPrice(ils, lang) {
    const { symbol, rate, position } = CURRENCY[lang] ?? CURRENCY.he;
    const value = Math.round(ils * rate);
    const formatted = value.toLocaleString(lang === 'he' ? 'he-IL' : 'en-US');
    return position === 'prefix' ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
}

export const FREE_SHIPPING_THRESHOLD = 500;

export const dict = {
    he: {
        dir: 'rtl',
        brandTagline: 'משקפיים שנעשו כדי להיראות',
        nav: { collection: 'הקולקציה', story: 'הסיפור', fit: 'מצאו את הצורה', care: 'שירות' },
        announce: [
            'משלוח חינם בהזמנה מעל 500 ₪',
            '30 יום להחזרה, בלי לשאול שאלות',
            'כל זוג נבדק ידנית לפני שהוא נשלח'
        ],
        hero: {
            eyebrow: 'קולקציית 2026',
            title1: 'משקפיים',
            title2: 'שנעשו כדי',
            title3: 'להיראות',
            body: 'אצטט איטלקי, ליטוש בעבודת יד, וסירוב עקרוני לעשות עוד זוג משקפיים שנראה כמו כל השאר.',
            cta: 'לקולקציה',
            ctaAlt: 'מצאו את הצורה שלכם',
            scroll: 'גללו'
        },
        marquee: ['אצטט איטלקי', 'ליטוש ידני', 'הגנת UV400', 'משלוח חינם', 'אחריות שנתיים', 'עיצוב ישראלי'],
        sections: {
            featured: 'הנבחרים',
            featuredSub: 'שלושת הדגמים שאנחנו הכי מתקשים לשמור במלאי',
            all: 'כל הדגמים',
            allSub: 'עשרה דגמים, שישה עשר גוונים, אפס פשרות',
            story: 'איך זה נעשה',
            reviews: 'מה אומרים',
            fit: 'איזו מסגרת מתאימה לפנים שלכם?',
            fitSub: 'ענו על שלוש שאלות ונציע לכם שלוש מסגרות',
            newsletter: 'קבלו 10% הנחה'
        },
        product: {
            addToCart: 'הוספה לסל',
            added: 'נוסף לסל',
            soldOut: 'אזל',
            quickView: 'הצצה מהירה',
            color: 'צבע מסגרת',
            lens: 'עדשה',
            lensOption: 'סוג עדשה',
            specs: 'מידות',
            lensWidth: 'רוחב עדשה',
            bridge: 'גשר',
            temple: 'זרוע',
            weight: 'משקל',
            details: 'פרטים',
            story: 'הסיפור',
            shipping: 'משלוח והחזרות',
            shippingBody:
                'משלוח חינם בהזמנה מעל 500 ₪, אחרת 29 ₪. שליח עד הבית תוך 2–4 ימי עסקים. 30 יום להחזרה מלאה, גם אם פשוט התחרטתם.',
            related: 'אולי גם יתאים לכם',
            reviews: 'ביקורות',
            spin: 'גררו לסיבוב',
            spinHint: 'תצוגת 360°',
            fitsFaces: 'מתאים לפנים',
            inStock: 'במלאי, נשלח היום',
            from: 'החל מ־'
        },
        cart: {
            title: 'הסל שלכם',
            empty: 'הסל עדיין ריק',
            emptyBody: 'הדגמים שלנו נוטים להיעלם מהר. שווה להסתכל.',
            emptyCta: 'לקולקציה',
            subtotal: 'סכום ביניים',
            shipping: 'משלוח',
            free: 'חינם',
            total: 'סה״כ',
            checkout: 'למעבר לתשלום',
            continue: 'המשך קנייה',
            remove: 'הסרה',
            qty: 'כמות',
            freeShipIn: (amount) => `עוד ${amount} למשלוח חינם`,
            freeShipDone: 'קיבלתם משלוח חינם',
            promo: 'קוד הנחה',
            apply: 'החלה',
            promoOk: 'הקוד הוחל',
            promoBad: 'קוד לא תקין',
            discount: 'הנחה'
        },
        checkout: {
            title: 'סיכום הזמנה',
            body: 'זו חנות הדגמה — לא תתבצע חיוב אמיתי. השאירו פרטים ונחזור אליכם.',
            name: 'שם מלא',
            email: 'אימייל',
            address: 'כתובת למשלוח',
            place: 'שליחת ההזמנה',
            done: 'ההזמנה נקלטה',
            doneBody: 'נשלח אליכם אישור במייל. תודה שבחרתם בנו.'
        },
        fit: {
            q1: 'מה צורת הפנים שלכם?',
            q2: 'איזה מראה אתם מחפשים?',
            q3: 'כמה נוכחות אתם רוצים?',
            looks: { classic: 'קלאסי ונקי', bold: 'נועז ובולט', soft: 'רך וטבעי' },
            presence: { low: 'שקטה', mid: 'מאוזנת', high: 'מלאה' },
            result: 'שלוש מסגרות בשבילכם',
            again: 'שאלון מחדש',
            next: 'הבא',
            back: 'חזרה',
            unsure: 'לא בטוחים?',
            unsureBody: 'הפנים שלכם רחבות בערך כמו שהן ארוכות? עגול. לסת מרובעת וברורה? מרובע. מצח רחב וסנטר צר? לב.'
        },
        filters: {
            title: 'סינון',
            shape: 'צורה',
            color: 'גוון',
            price: 'מחיר',
            sort: 'מיון',
            sortOptions: {
                featured: 'מומלץ',
                priceAsc: 'מחיר: מהנמוך לגבוה',
                priceDesc: 'מחיר: מהגבוה לנמוך',
                rating: 'הכי מדורג'
            },
            clear: 'ניקוי',
            results: (n) => `${n} דגמים`,
            none: 'לא נמצאו דגמים. נסו לנקות את הסינון.'
        },
        badges: { new: 'חדש', bestseller: 'רב מכר' },
        newsletter: {
            body: 'הצטרפו לרשימה ותקבלו 10% על ההזמנה הראשונה, ועדכון אחד בחודש. לא יותר.',
            placeholder: 'האימייל שלכם',
            submit: 'הצטרפות',
            thanks: 'תודה. הקוד בדרך אליכם.'
        },
        footer: {
            shop: 'חנות',
            about: 'המותג',
            help: 'עזרה',
            rights: 'כל הזכויות שמורות',
            contact: 'צור קשר',
            faq: 'שאלות נפוצות',
            returns: 'החזרות',
            care: 'טיפוח המסגרת',
            demo: 'אתר הדגמה — לא מתבצעות עסקאות אמיתיות'
        },
        story: {
            title: 'שלושים יום למסגרת אחת',
            lead: 'לא בגלל שזה רומנטי. בגלל שאצטט צריך לנוח בין שלב לשלב, אחרת הוא מתעוות אחרי חודשיים על הפנים שלכם.',
            steps: [
                { n: '01', t: 'הבלוק', b: 'בלוק אצטט איטלקי בעובי 8 מ״מ, נחתך לחזית אחת בלייזר ונשלח לייבוש של שבעה ימים.' },
                { n: '02', t: 'הליטוש', b: 'שלושה ימים בצילינדר עם שבבי עץ אגוז. אין קיצור דרך שנותן את הברק הזה.' },
                { n: '03', t: 'ההרכבה', b: 'צירים מוטמעים בחום, מסמרות נלחצות ביד, זרועות מיושרות לפי תבנית פנים אמיתית.' },
                { n: '04', t: 'הבדיקה', b: 'כל זוג עובר בדיקת יישור, בדיקת UV ובדיקת עין אנושית אחת אחרונה לפני האריזה.' }
            ]
        },
        reviews: [
            { q: 'קניתי את מארלו לפני שנה, נופלים לי מהתיק כל שבוע, ועדיין נראים חדשים.', a: 'דניאל כ׳, תל אביב' },
            { q: 'ההקסה בגוון הזית זה הדבר היחיד שאנשים שואלים אותי עליו.', a: 'שירה מ׳, חיפה' },
            { q: 'ההזמנה הגיעה ביומיים, המסגרת יושבת מושלם, לא נגעתי בה מאז שהרכבתי.', a: 'עומר ל׳, ירושלים' }
        ]
    },
    en: {
        dir: 'ltr',
        brandTagline: 'Eyewear made to be seen',
        nav: { collection: 'Collection', story: 'Story', fit: 'Find your fit', care: 'Service' },
        announce: ['Free shipping over $140', '30-day returns, no questions', 'Every pair inspected by hand'],
        hero: {
            eyebrow: '2026 Collection',
            title1: 'Eyewear',
            title2: 'made to',
            title3: 'be seen',
            body: 'Italian acetate, hand polish, and a principled refusal to make another pair of glasses that looks like everyone else’s.',
            cta: 'Shop the collection',
            ctaAlt: 'Find your shape',
            scroll: 'Scroll'
        },
        marquee: ['Italian acetate', 'Hand polished', 'UV400 protection', 'Free shipping', 'Two-year warranty', 'Designed in Tel Aviv'],
        sections: {
            featured: 'Featured',
            featuredSub: 'The three we struggle hardest to keep in stock',
            all: 'Every frame',
            allSub: 'Ten models, sixteen colourways, zero compromises',
            story: 'How it is made',
            reviews: 'What people say',
            fit: 'Which frame fits your face?',
            fitSub: 'Answer three questions, get three frames',
            newsletter: 'Take 10% off'
        },
        product: {
            addToCart: 'Add to bag',
            added: 'Added to bag',
            soldOut: 'Sold out',
            quickView: 'Quick view',
            color: 'Frame colour',
            lens: 'Lens',
            lensOption: 'Lens type',
            specs: 'Measurements',
            lensWidth: 'Lens width',
            bridge: 'Bridge',
            temple: 'Temple',
            weight: 'Weight',
            details: 'Details',
            story: 'Story',
            shipping: 'Shipping and returns',
            shippingBody:
                'Free shipping over $140, otherwise $8. Courier to your door in 2–4 business days. 30 days for a full refund, even if you simply changed your mind.',
            related: 'You may also like',
            reviews: 'reviews',
            spin: 'Drag to rotate',
            spinHint: '360° view',
            fitsFaces: 'Suits',
            inStock: 'In stock, ships today',
            from: 'From '
        },
        cart: {
            title: 'Your bag',
            empty: 'Your bag is empty',
            emptyBody: 'Our frames tend to disappear quickly. Worth a look.',
            emptyCta: 'Shop the collection',
            subtotal: 'Subtotal',
            shipping: 'Shipping',
            free: 'Free',
            total: 'Total',
            checkout: 'Checkout',
            continue: 'Keep shopping',
            remove: 'Remove',
            qty: 'Qty',
            freeShipIn: (amount) => `${amount} away from free shipping`,
            freeShipDone: 'You have free shipping',
            promo: 'Promo code',
            apply: 'Apply',
            promoOk: 'Code applied',
            promoBad: 'Invalid code',
            discount: 'Discount'
        },
        checkout: {
            title: 'Order summary',
            body: 'This is a demo store — no real payment is taken. Leave your details and we will be in touch.',
            name: 'Full name',
            email: 'Email',
            address: 'Shipping address',
            place: 'Place order',
            done: 'Order received',
            doneBody: 'A confirmation is on its way to your inbox. Thank you for choosing us.'
        },
        fit: {
            q1: 'What is your face shape?',
            q2: 'What look are you after?',
            q3: 'How much presence do you want?',
            looks: { classic: 'Classic and clean', bold: 'Bold and loud', soft: 'Soft and natural' },
            presence: { low: 'Quiet', mid: 'Balanced', high: 'Full' },
            result: 'Three frames for you',
            again: 'Start over',
            next: 'Next',
            back: 'Back',
            unsure: 'Not sure?',
            unsureBody:
                'Face about as wide as it is long? Round. Strong, squared jaw? Square. Wide forehead, narrow chin? Heart.'
        },
        filters: {
            title: 'Filter',
            shape: 'Shape',
            color: 'Colour',
            price: 'Price',
            sort: 'Sort',
            sortOptions: {
                featured: 'Featured',
                priceAsc: 'Price: low to high',
                priceDesc: 'Price: high to low',
                rating: 'Top rated'
            },
            clear: 'Clear',
            results: (n) => `${n} frames`,
            none: 'No frames match. Try clearing the filters.'
        },
        badges: { new: 'New', bestseller: 'Bestseller' },
        newsletter: {
            body: 'Join the list for 10% off your first order and one update a month. No more than that.',
            placeholder: 'Your email',
            submit: 'Join',
            thanks: 'Thank you. Your code is on the way.'
        },
        footer: {
            shop: 'Shop',
            about: 'Brand',
            help: 'Help',
            rights: 'All rights reserved',
            contact: 'Contact',
            faq: 'FAQ',
            returns: 'Returns',
            care: 'Frame care',
            demo: 'Demo storefront — no real transactions are processed'
        },
        story: {
            title: 'Thirty days for one frame',
            lead: 'Not for romance. Acetate has to rest between stages, or it warps on your face two months later.',
            steps: [
                { n: '01', t: 'The block', b: 'An 8mm Italian acetate block, laser-cut into a single front and left to dry for seven days.' },
                { n: '02', t: 'The polish', b: 'Three days tumbling with walnut chips. There is no shortcut that produces this shine.' },
                { n: '03', t: 'Assembly', b: 'Hinges heat-set, rivets hand-pressed, temples aligned against a real face template.' },
                { n: '04', t: 'Inspection', b: 'Every pair gets an alignment check, a UV check, and one last human eye before it is boxed.' }
            ]
        },
        reviews: [
            { q: 'I bought Marlow a year ago, drop it out of my bag weekly, and it still looks new.', a: 'Daniel K., Tel Aviv' },
            { q: 'The olive Hexa is the only thing strangers ask me about.', a: 'Shira M., Haifa' },
            { q: 'Arrived in two days, sits perfectly, and I have not taken it off since.', a: 'Omer L., Jerusalem' }
        ]
    }
};
