export const FREE_SHIPPING = 400;
export const SHIPPING = 29;
export const PROMOS = { MAOR10: 0.1, WELCOME10: 0.1 };

export const copy = {
    he: {
        dir: 'rtl',
        tagline: 'אביזרים שנעשו כדי להיראות',
        service: ['משלוח חינם מעל 400 ₪', 'החלפה והחזרה עד 30 יום', 'אריזת מתנה', 'שירות בעברית'],
        nav: {
            shop: 'לחנות',
            new: 'חדש',
            about: 'הסיפור',
            help: 'שירות',
            search: 'חיפוש',
            saved: 'שמורים',
            bag: 'התיק',
            menu: 'תפריט',
            close: 'סגירה'
        },
        home: {
            heroEyebrow: 'קולקציית סתיו 2026',
            heroTitle: 'פריטים בודדים,\nנבחרים אחד־אחד',
            heroBody: 'משקפיים, שעונים, תכשיטים, תיקים וארנקים. עשרה פריטים, בלי קטלוג אינסופי.',
            heroCta: 'לקולקציה',
            heroAlt: 'מה חדש',
            newTitle: 'חדש השבוע',
            newSub: 'הפריטים האחרונים שנכנסו',
            categoriesTitle: 'לפי סוג',
            categoriesSub: 'שש מגירות, בלי קטלוג אינסופי',
            lookTitle: 'הלוק השלם',
            lookBody: 'שלושה פריטים שעובדים יחד מהבוקר עד הערב — שעון, צמיד ומשקפיים שמתאימים בגוון ובמשקל.',
            lookCta: 'לקנות את הלוק',
            editTitle: 'איך אנחנו בוחרים',
            editBody: 'כל פריט נבדק על גוף אמיתי לפני שהוא נכנס. מה שלא יושב טוב — לא נכנס לקולקציה.',
            editCta: 'הסיפור שלנו'
        },
        listing: {
            all: 'כל הפריטים',
            allSub: 'עשרה פריטים בשש קטגוריות',
            filters: 'סינון',
            colour: 'צבע',
            price: 'מחיר',
            clear: 'ניקוי',
            sort: 'מיון',
            sortOptions: { featured: 'מומלץ', new: 'הכי חדש', priceAsc: 'מחיר: נמוך לגבוה', priceDesc: 'מחיר: גבוה לנמוך' },
            results: (n) => (n === 1 ? 'פריט אחד' : `${n} פריטים`),
            none: 'אין פריטים שמתאימים לסינון הזה.',
            inStock: 'במלאי',
            lastOnes: (n) => `נשארו ${n}`,
            soldOut: 'אזל'
        },
        product: {
            add: 'הוספה לתיק',
            added: 'נוסף לתיק',
            colour: 'צבע',
            fabric: 'בד',
            care: 'טיפול',
            details: 'פרטים',
            specs: 'מפרט',
            shipping: 'משלוח והחזרות',
            shippingBody:
                'משלוח חינם מעל 400 ₪, אחרת 29 ₪. שליח עד הבית תוך 2–4 ימי עסקים. 30 יום להחלפה או החזרה, כל עוד התווית במקום.',
            complete: 'משלים את הלוק',
            save: 'שמירה',
            saved: 'שמור',
            stock: 'במלאי, נשלח היום'
        },
        bag: {
            title: 'התיק שלכם',
            empty: 'התיק ריק.',
            emptyCta: 'לחנות',
            subtotal: 'סכום ביניים',
            shipping: 'משלוח',
            free: 'חינם',
            discount: 'הנחה',
            total: 'סה״כ',
            promo: 'קוד קופון',
            apply: 'החלה',
            promoBad: 'הקוד לא תקף',
            remove: 'הסרה',
            checkout: 'למעבר לתשלום',
            keep: 'המשך קנייה',
            toFree: (sum) => `עוד ${sum} למשלוח חינם`,
            gotFree: 'יש לכם משלוח חינם',
            each: 'ליחידה'
        },
        checkout: {
            title: 'תשלום',
            summary: 'סיכום ההזמנה',
            pay: 'לתשלום מאובטח',
            working: 'רגע…',
            error: 'המעבר לתשלום נכשל. נסו שוב בעוד רגע.',
            fallback: 'הדגמה: אין חיבור תשלומים על הסביבה הזו, אז ההזמנה נרשמה מקומית בלבד.',
            done: 'ההזמנה נקלטה',
            doneBody: 'נשלח אישור במייל. תודה שבחרתם בנו.',
            back: 'חזרה לחנות'
        },
        search: {
            title: 'חיפוש',
            placeholder: 'מה אתם מחפשים?',
            hint: 'שם פריט, קטגוריה, בד או צבע',
            empty: 'לא נמצא כלום. נסו מילה אחרת.',
            start: 'התחילו להקליד',
            clear: 'ניקוי'
        },
        saved: {
            title: 'הפריטים השמורים',
            sub: 'נשמר במכשיר הזה בלבד.',
            empty: 'עוד לא שמרתם כלום.',
            browse: 'לחנות'
        },
        about: {
            title: 'הסיפור',
            lead: 'התחלנו כי לא מצאנו זוג משקפיים אחד ששווה את המחיר שביקשו עליו.',
            steps: [
                { t: 'חומר קודם', b: 'בודקים את החומר לפני הצורה. חומר גרוע בעיצוב יפה הוא עדיין חומר גרוע.' },
                { t: 'דגימה לפני הזמנה', b: 'כל פריט מגיע אלינו ראשון, ורק אחר כך נכנס לקטלוג.' },
                { t: 'לובשים לפני שמוכרים', b: 'חודש שלם בשימוש יומיומי, כולל שריטות.' },
                { t: 'לא ממהרים', b: 'מוסיפים פריט רק כשהוא באמת טוב יותר ממה שכבר יש.' }
            ]
        },
        help: {
            title: 'שירות',
            lead: 'הכול במקום אחד, בלי לחפש.',
            groups: [
                {
                    t: 'משלוחים',
                    items: [
                        ['כמה זמן לוקח משלוח?', '2–4 ימי עסקים עם שליח עד הבית.'],
                        ['כמה עולה משלוח?', '29 ₪, וחינם מעל 400 ₪.'],
                        ['אפשר איסוף עצמי?', 'כרגע לא. הכול נשלח עד הבית.']
                    ]
                },
                {
                    t: 'החזרות והחלפות',
                    items: [
                        ['מה מדיניות ההחזרה?', '30 יום מיום קבלת ההזמנה, כל עוד התווית במקום והפריט לא נלבש.'],
                        ['החלפת מידה עולה כסף?', 'לא. החלפה ראשונה על חשבוננו.'],
                        ['איך מחזירים?', 'כותבים לנו ואנחנו שולחים שליח לאיסוף.']
                    ]
                },
                {
                    t: 'טיפול ותחזוקה',
                    items: [
                        ['איך מנקים משקפיים?', 'מטלית מיקרופייבר יבשה. נוזלים עם אלכוהול פוגעים בציפוי.'],
                        ['התכשיטים מחלידים?', 'הפלדה לא. הציפויים — לא להיכנס איתם למקלחת או לים.'],
                        ['השעון עמיד למים?', 'הכרונוגרף עמיד ל־3 ATM: גשם והתזות, לא שחייה.']
                    ]
                }
            ]
        },
        news: {
            title: 'עשרה אחוז על ההזמנה הראשונה',
            body: 'מייל אחד בחודש: מה נכנס, מה חוזר למלאי. בלי ספאם.',
            placeholder: 'האימייל שלכם',
            cta: 'הרשמה',
            done: 'נרשמתם. תודה.'
        },
        footer: {
            shop: 'חנות',
            brand: 'המותג',
            care: 'שירות',
            rights: 'כל הזכויות שמורות',
            demo: 'אתר הדגמה — לא מתבצעות עסקאות אמיתיות.'
        },
        badges: { new: 'חדש', bestseller: 'נמכר הכי טוב' }
    },

    en: {
        dir: 'ltr',
        tagline: 'Accessories made to be seen',
        service: ['Free shipping over $110', '30-day returns and exchanges', 'Gift wrapping', 'Hebrew and English support'],
        nav: {
            shop: 'Shop',
            new: 'New',
            about: 'Story',
            help: 'Service',
            search: 'Search',
            saved: 'Saved',
            bag: 'Bag',
            menu: 'Menu',
            close: 'Close'
        },
        home: {
            heroEyebrow: 'Autumn 2026',
            heroTitle: 'A few pieces,\nchosen one at a time',
            heroBody: 'Eyewear, watches, jewellery, bags and wallets. Ten pieces, not an endless catalogue.',
            heroCta: 'Shop the collection',
            heroAlt: 'What is new',
            newTitle: 'New this week',
            newSub: 'The latest pieces to arrive',
            categoriesTitle: 'By type',
            categoriesSub: 'Six drawers, not an endless catalogue',
            lookTitle: 'The whole look',
            lookBody: 'Three pieces that work together from morning to evening — a watch, a bracelet and a frame matched in tone and weight.',
            lookCta: 'Shop the look',
            editTitle: 'How we choose',
            editBody: 'Every piece is worn on a real body before it joins the range. What does not sit well does not get in.',
            editCta: 'Our story'
        },
        listing: {
            all: 'Everything',
            allSub: 'Ten pieces across six categories',
            filters: 'Filter',
            colour: 'Colour',
            price: 'Price',
            clear: 'Clear',
            sort: 'Sort',
            sortOptions: { featured: 'Featured', new: 'Newest', priceAsc: 'Price: low to high', priceDesc: 'Price: high to low' },
            results: (n) => (n === 1 ? '1 piece' : `${n} pieces`),
            none: 'Nothing matches that filter.',
            inStock: 'In stock',
            lastOnes: (n) => `${n} left`,
            soldOut: 'Sold out'
        },
        product: {
            add: 'Add to bag',
            added: 'Added to bag',
            colour: 'Colour',
            fabric: 'Fabric',
            care: 'Care',
            details: 'Details',
            specs: 'Specification',
            shipping: 'Shipping and returns',
            shippingBody:
                'Free shipping over $110, otherwise $8. Courier to your door in 2–4 business days. 30 days to exchange or return while the tag is still on.',
            complete: 'Completes the look',
            save: 'Save',
            saved: 'Saved',
            stock: 'In stock, ships today'
        },
        bag: {
            title: 'Your bag',
            empty: 'Your bag is empty.',
            emptyCta: 'Shop',
            subtotal: 'Subtotal',
            shipping: 'Shipping',
            free: 'Free',
            discount: 'Discount',
            total: 'Total',
            promo: 'Promo code',
            apply: 'Apply',
            promoBad: 'That code is not valid',
            remove: 'Remove',
            checkout: 'Checkout',
            keep: 'Keep shopping',
            toFree: (sum) => `${sum} more for free shipping`,
            gotFree: 'You have free shipping',
            each: 'each'
        },
        checkout: {
            title: 'Checkout',
            summary: 'Order summary',
            pay: 'Pay securely',
            working: 'One moment…',
            error: 'Checkout failed. Try again in a moment.',
            fallback: 'Demo: no payment connection on this environment, so the order was recorded locally only.',
            done: 'Order received',
            doneBody: 'A confirmation is on its way by email. Thank you.',
            back: 'Back to the shop'
        },
        search: {
            title: 'Search',
            placeholder: 'What are you after?',
            hint: 'Piece, category, fabric or colour',
            empty: 'Nothing found. Try another word.',
            start: 'Start typing',
            clear: 'Clear'
        },
        saved: {
            title: 'Saved pieces',
            sub: 'Kept on this device only.',
            empty: 'Nothing saved yet.',
            browse: 'Shop'
        },
        about: {
            title: 'Story',
            lead: 'We started because we could not find one pair of frames worth what was being asked for them.',
            steps: [
                { t: 'Material first', b: 'The material is checked before the shape. Bad material in a nice design is still bad material.' },
                { t: 'Sampled before ordered', b: 'Every piece comes to us first, and only then joins the catalogue.' },
                { t: 'Worn before sold', b: 'A full month of daily use, scratches included.' },
                { t: 'No rush', b: 'A piece is added only when it genuinely beats what is already there.' }
            ]
        },
        help: {
            title: 'Service',
            lead: 'Everything in one place.',
            groups: [
                {
                    t: 'Delivery',
                    items: [
                        ['How long does delivery take?', '2–4 business days by courier.'],
                        ['What does shipping cost?', '$8, and free over $110.'],
                        ['Can I collect in person?', 'Not yet. Everything ships to your door.']
                    ]
                },
                {
                    t: 'Returns and exchanges',
                    items: [
                        ['What is the returns policy?', '30 days from delivery while the tag is on and the piece is unworn.'],
                        ['Does a size exchange cost anything?', 'No. The first exchange is on us.'],
                        ['How do I return something?', 'Write to us and we send a courier to collect it.']
                    ]
                },
                {
                    t: 'Care and upkeep',
                    items: [
                        ['How do I clean the frames?', 'A dry microfibre cloth. Alcohol-based liquids damage the coating.'],
                        ['Will the jewellery tarnish?', 'The steel will not. Plated pieces should stay out of the shower and the sea.'],
                        ['Is the watch water resistant?', 'The chronograph is 3 ATM: rain and splashes, not swimming.']
                    ]
                }
            ]
        },
        news: {
            title: 'Ten percent off your first order',
            body: 'One email a month: what arrived, what came back in stock. No spam.',
            placeholder: 'Your email',
            cta: 'Sign up',
            done: 'You are on the list. Thank you.'
        },
        footer: {
            shop: 'Shop',
            brand: 'Brand',
            care: 'Service',
            rights: 'All rights reserved',
            demo: 'Demo site — no real transactions.'
        },
        badges: { new: 'New', bestseller: 'Bestseller' }
    }
};
