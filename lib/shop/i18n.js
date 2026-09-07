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
        brandTagline: 'אביזרים שנעשו כדי להיראות',
        nav: {
            collection: 'הקולקציה',
            story: 'הסיפור',
            fit: 'התאמת משקפיים',
            care: 'שירות',
            search: 'חיפוש',
            wishlist: 'המועדפים'
        },
        announce: [
            'משלוח חינם בהזמנה מעל 500 ₪',
            '30 יום להחזרה, בלי לשאול שאלות',
            'כל פריט נבדק ידנית לפני שהוא נשלח'
        ],
        hero: {
            eyebrow: 'קולקציית 2026',
            title1: 'אביזרים',
            title2: 'שנעשו כדי',
            title3: 'להיראות',
            body: 'משקפיים, שעונים, תכשיטים ותיקים. פריטים נבחרים אחד־אחד, בלי קטלוג אינסופי של דברים שאף אחד לא צריך.',
            cta: 'לקולקציה',
            ctaAlt: 'מצאו את המסגרת שלכם',
            ctaCategories: 'לפי קטגוריה',
            scroll: 'גללו'
        },
        marquee: ['משלוח חינם מעל 500 ₪', '30 יום להחזרה', 'אריזת מתנה', 'שירות בעברית', 'אריזה ביום העסקים הבא', 'עיצוב ישראלי'],
        sections: {
            featured: 'הנבחרים',
            featuredSub: 'שלושת המוצרים שאנחנו הכי מתקשים לשמור במלאי',
            all: 'הכל',
            allSub: 'תשעה מוצרים בשש קטגוריות',
            categories: 'הקטגוריות',
            categoriesSub: 'משקפיים, שעונים, תכשיטים, תיקים, ארנקים וכובעים',
            story: 'איך זה נעשה',
            promises: 'ההבטחה שלנו',
            fit: 'מחפשים משקפיים? נתאים אותם לפנים שלכם',
            fitSub: 'שלוש שאלות, ואנחנו נצביע על המסגרת מקולקציית המשקפיים',
            newsletter: 'קבלו 10% הנחה',
            recent: 'צפיתם לאחרונה',
            recentSub: 'נשמר במכשיר שלכם בלבד'
        },
        search: {
            title: 'חיפוש',
            sub: 'שם מוצר, קטגוריה, צבע או מילה מתוך התיאור',
            placeholder: 'מה אתם מחפשים?',
            empty: 'לא נמצאו מוצרים. נסו מילה אחרת.',
            start: 'התחילו להקליד, או בחרו קטגוריה',
            clear: 'ניקוי החיפוש',
            popular: 'חיפושים נפוצים'
        },
        wishlist: {
            title: 'המועדפים שלי',
            sub: 'נשמר במכשיר הזה. אף אחד לא רואה אותו חוץ מכם.',
            empty: 'עוד לא שמרתם כלום.',
            browse: 'לקולקציה',
            clear: 'ניקוי הרשימה',
            count: (n) => (n === 1 ? 'פריט אחד' : `${n} פריטים`)
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
            spin: 'גררו לסיבוב',
            spinHint: 'תצוגת 360°',
            fitsFaces: 'מתאים לפנים',
            inStock: 'במלאי, נשלח היום',
            from: 'החל מ־'
        },
        tryOn: {
            title: 'מדידה במצלמה',
            cta: 'מדדו במצלמה',
            close: 'סגירה',
            loading: 'מפעילים את המצלמה ומורידים את מודל זיהוי הפנים...',
            denied: 'לא קיבלנו גישה למצלמה. אפשר לאשר אותה בהגדרות הדפדפן ולנסות שוב.',
            error: 'המדידה לא נטענה. ייתכן שהדפדפן לא תומך, או שהחיבור חסם את המודל.',
            searching: 'מחפשים פנים במסגרת. נסו להתקרב ולהאיר את הפנים.',
            note: 'התצוגה היא סימולציה: המסגרת מצוירת לפי המידות האמיתיות של הדגם (רוחב עדשה, גשר וזרוע) ומותאמת לרוחב העיניים שלכם. היא נותנת תחושה של גודל ופרופורציה, לא של הגימור והצבע המדויקים.'
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
            place: 'מעבר לתשלום',
            working: 'מעבירים לתשלום...',
            payError: 'המעבר לתשלום נכשל. נסו שוב בעוד רגע.',
            done: 'ההזמנה נקלטה',
            doneBody: 'נשלח אליכם אישור במייל. תודה שבחרתם בנו.'
        },
        fit: {
            q1: 'מה צורת הפנים שלכם?',
            q2: 'איזה מראה אתם מחפשים?',
            q3: 'כמה נוכחות אתם רוצים?',
            looks: { classic: 'קלאסי ונקי', bold: 'נועז ובולט', soft: 'רך וטבעי' },
            presence: { low: 'שקטה', mid: 'מאוזנת', high: 'מלאה' },
            result: 'המסגרות שנבחרו בשבילכם',
            again: 'שאלון מחדש',
            next: 'הבא',
            back: 'חזרה',
            unsure: 'לא בטוחים?',
            unsureBody: 'הפנים שלכם רחבות בערך כמו שהן ארוכות? עגול. לסת מרובעת וברורה? מרובע. מצח רחב וסנטר צר? לב.'
        },
        filters: {
            title: 'סינון',
            category: 'קטגוריה',
            color: 'גוון',
            price: 'מחיר',
            sort: 'מיון',
            sortOptions: {
                featured: 'מומלץ',
                priceAsc: 'מחיר: מהנמוך לגבוה',
                priceDesc: 'מחיר: מהגבוה לנמוך',
                new: 'חדש בקולקציה'
            },
            clear: 'ניקוי',
            results: (n) => `${n} מוצרים`,
            none: 'לא נמצאו מוצרים. נסו לנקות את הסינון.'
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
            title: 'איך נבחר פריט',
            lead: 'כל פריט נבחר לפי איך שהוא נראה ומרגיש על אדם אמיתי, לא לפי מה שמצטלם טוב בקטלוג.',
            steps: [
                { n: '01', t: 'הצורה', b: 'מתחילים מהקו: כמה הפריט גדול, איפה הוא נגמר, ולמי הוא מחמיא.' },
                { n: '02', t: 'החומר', b: 'אצטט, פלדת אל־חלד או עור. חומר שמחזיק צורה אחרי שנה, לא רק בקופסה.' },
                { n: '03', t: 'הפרט', b: 'מסמרת, חריטה או אבזם. פרט אחד שמספיק כדי לזהות את הפריט מרחוק.' },
                { n: '04', t: 'ההתאמה', b: 'כל פריט נלבש לפני שהוא נכנס לקולקציה. מה שלא יושב, לא נכנס.' }
            ]
        },
        promises: [
            { t: '30 יום להחזרה', b: 'לא התחברתם למסגרת? מחזירים אותה עם הנרתיק ומקבלים החזר כספי מלא.' },
            { t: 'משלוח עד הבית', b: 'שליח תוך 2–4 ימי עסקים, חינם בהזמנה מעל 500 ₪.' },
            { t: 'התאמה אישית', b: 'כותבים לנו לפני ההזמנה ונעזור לכם לבחור לפי צורת הפנים והמספר האופטי.' }
        ]
    },
    en: {
        dir: 'ltr',
        brandTagline: 'Accessories made to be seen',
        nav: {
            collection: 'Collection',
            story: 'Story',
            fit: 'Eyewear fit finder',
            care: 'Service',
            search: 'Search',
            wishlist: 'Saved'
        },
        announce: ['Free shipping over $140', '30-day returns, no questions', 'Every piece inspected by hand'],
        hero: {
            eyebrow: '2026 Collection',
            title1: 'Accessories',
            title2: 'made to',
            title3: 'be seen',
            body: 'Eyewear, watches, jewellery and bags. Chosen one at a time, without an endless catalogue of things nobody needs.',
            cta: 'Shop the collection',
            ctaAlt: 'Find your frame',
            ctaCategories: 'Shop by category',
            scroll: 'Scroll'
        },
        marquee: ['Free shipping over $140', '30-day returns', 'Gift wrapping', 'Hebrew and English support', 'Packed next business day', 'Designed in Tel Aviv'],
        sections: {
            featured: 'Featured',
            featuredSub: 'The three we struggle hardest to keep in stock',
            all: 'Everything',
            allSub: 'Nine products across six categories',
            categories: 'Categories',
            categoriesSub: 'Eyewear, watches, jewellery, bags, wallets and caps',
            story: 'How it is made',
            promises: 'Our promise',
            fit: 'Looking for eyewear? We will match it to your face',
            fitSub: 'Three questions, and we point you at the frame from the eyewear collection',
            newsletter: 'Take 10% off',
            recent: 'Recently viewed',
            recentSub: 'Kept on your device only'
        },
        search: {
            title: 'Search',
            sub: 'Product name, category, colour or a word from the description',
            placeholder: 'What are you after?',
            empty: 'Nothing matched. Try another word.',
            start: 'Start typing, or pick a category',
            clear: 'Clear search',
            popular: 'Popular searches'
        },
        wishlist: {
            title: 'Saved items',
            sub: 'Kept on this device. Nobody sees it but you.',
            empty: 'Nothing saved yet.',
            browse: 'Browse the collection',
            clear: 'Clear the list',
            count: (n) => (n === 1 ? '1 item' : `${n} items`)
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
            spin: 'Drag to rotate',
            spinHint: '360° view',
            fitsFaces: 'Suits',
            inStock: 'In stock, ships today',
            from: 'From '
        },
        tryOn: {
            title: 'Camera try-on',
            cta: 'Try it on',
            close: 'Close',
            loading: 'Starting the camera and loading the face model...',
            denied: 'The camera was not allowed. Enable it in your browser settings and try again.',
            error: 'Try-on failed to load. Your browser may not support it, or the model was blocked.',
            searching: 'Looking for a face. Move closer and add some light.',
            note: 'This is a simulation: the frame is drawn from the model\u2019s real measurements (lens width, bridge and temple) and scaled to your eye span. It gives you size and proportion, not the exact finish and colour.'
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
            place: 'Continue to payment',
            working: 'Taking you to payment...',
            payError: 'Could not reach payment. Try again in a moment.',
            done: 'Order received',
            doneBody: 'A confirmation is on its way to your inbox. Thank you for choosing us.'
        },
        fit: {
            q1: 'What is your face shape?',
            q2: 'What look are you after?',
            q3: 'How much presence do you want?',
            looks: { classic: 'Classic and clean', bold: 'Bold and loud', soft: 'Soft and natural' },
            presence: { low: 'Quiet', mid: 'Balanced', high: 'Full' },
            result: 'The frames we picked for you',
            again: 'Start over',
            next: 'Next',
            back: 'Back',
            unsure: 'Not sure?',
            unsureBody:
                'Face about as wide as it is long? Round. Strong, squared jaw? Square. Wide forehead, narrow chin? Heart.'
        },
        filters: {
            title: 'Filter',
            category: 'Category',
            color: 'Colour',
            price: 'Price',
            sort: 'Sort',
            sortOptions: {
                featured: 'Featured',
                priceAsc: 'Price: low to high',
                priceDesc: 'Price: high to low',
                new: 'New in'
            },
            clear: 'Clear',
            results: (n) => `${n} products`,
            none: 'Nothing matches. Try clearing the filters.'
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
            title: 'How a piece gets chosen',
            lead: 'Every piece is picked for how it looks and feels on a real person, not for how it photographs in a catalogue.',
            steps: [
                { n: '01', t: 'The shape', b: 'It starts with the line: how big the piece runs, where it ends, who it flatters.' },
                { n: '02', t: 'The material', b: 'Acetate, stainless steel or leather. Material that holds its shape after a year, not just in the box.' },
                { n: '03', t: 'The detail', b: 'A rivet, an engraving, a clasp. One detail is enough to recognise a piece across a room.' },
                { n: '04', t: 'The fit', b: 'Every piece is worn before it joins the collection. What does not sit, does not ship.' }
            ]
        },
        promises: [
            { t: '30-day returns', b: 'Not feeling the frame? Send it back with its case for a full refund.' },
            { t: 'Delivered to you', b: 'Courier in 2–4 business days, free over $140.' },
            { t: 'Help choosing', b: 'Write before you order and we will help you pick for your face shape and prescription.' }
        ]
    }
};
