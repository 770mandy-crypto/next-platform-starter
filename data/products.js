/*
AM CLOTHING — local catalog.

This is the fallback source of truth: when the Shopify Storefront credentials are
configured (see lib/shopify.js), products are pulled live from Shopify instead and
this file is only used for local development and previews.

PRICES ARE PLACEHOLDERS — set the real ones here and everything on the site
follows. `photo` is the product photograph; `cut` and `tone` still matter because
they drive the vector rendering that shows underneath while the photo loads, and
that stands in if the photo ever fails to load.
*/

export const categories = [
    { slug: 'tees', name: 'חולצות' },
    { slug: 'shorts', name: 'מכנסיים' },
    { slug: 'sets', name: 'סטים' }
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export const products = [
    {
        slug: 'am-tee-black',
        title: 'AM TEE — BLACK',
        titleHe: 'חולצת טי שחורה',
        category: 'tees',
        cut: 'tee',
        tone: 'black',
        photo: '/images/products/tee-black.jpg',
        price: 179,
        compareAtPrice: null,
        badge: 'קולקציית הפתיחה',
        featured: true,
        shortDescription: 'טי כותנה כבדה בגזרה נקייה, עם הלוגו רקום בזהב על החזה.',
        description:
            'החולצה שפותחת את הקולקציה. כותנה מסורקת כבדה שנופלת ישר ולא מתעוותת בכביסה, גזרה נקייה שאינה צמודה ואינה אוברסייז, והלוגו של AM ברקמת זהב על החזה השמאלי. שחור עמוק שנשאר שחור.',
        details: [
            '100% כותנה מסורקת, 240 גרם למ״ר',
            'רקמת זהב על החזה השמאלי',
            'צווארון ריב מחוזק שלא נמתח',
            'תפר כתף לכתף',
            'כביסת מכונה 30 מעלות, הפוך'
        ],
        colors: [{ name: 'שחור', hex: '#151517' }],
        sizes: SIZES
    },
    {
        slug: 'am-tee-white',
        title: 'AM TEE — WHITE',
        titleHe: 'חולצת טי לבנה',
        category: 'tees',
        cut: 'tee',
        tone: 'white',
        photo: '/images/products/tee-white.jpg',
        price: 179,
        compareAtPrice: null,
        badge: 'קולקציית הפתיחה',
        featured: true,
        shortDescription: 'אותה גזרה בלבן שמנת, עם הלוגו בזהב שמבליט את הניגוד.',
        description:
            'הגרסה הלבנה של הטי. אותה כותנה כבדה ואותה גזרה, בגוון לבן נקי שנותן לזהב לעבוד הכי חזק. הבד אטום מספיק כדי שלא יהיה שקוף, גם בלבן.',
        details: [
            '100% כותנה מסורקת, 240 גרם למ״ר',
            'רקמת זהב על החזה השמאלי',
            'צווארון ריב מחוזק שלא נמתח',
            'בד אטום, לא שקוף',
            'כביסת מכונה 30 מעלות, הפוך'
        ],
        colors: [{ name: 'לבן', hex: '#f3f1ec' }],
        sizes: SIZES
    },
    {
        slug: 'am-shorts-black',
        title: 'AM SHORTS — BLACK',
        titleHe: 'מכנסי פוטר שחורים',
        category: 'shorts',
        cut: 'shorts',
        tone: 'black',
        photo: '/images/products/shorts-black.jpg',
        price: 229,
        compareAtPrice: null,
        badge: null,
        featured: true,
        shortDescription: 'מכנסי פוטר קצרים עם שרוך זהב וכיסים צדדיים.',
        description:
            'פוטר מוברש מבפנים, גזרה ישרה שנעצרת מעל הברך, גומי במותן עם שרוך וקצוות זהב. שני כיסים צדדיים עמוקים שבאמת מחזיקים טלפון. הלוגו רקום בזהב על הרגל השמאלית.',
        details: [
            'פוטר 80% כותנה, 20% פוליאסטר, 320 גרם למ״ר',
            'מוברש מבפנים',
            'שרוך עם קצוות זהב מוברש',
            'שני כיסים צדדיים עמוקים',
            'רקמת זהב על הרגל השמאלית'
        ],
        colors: [{ name: 'שחור', hex: '#151517' }],
        sizes: SIZES
    },
    {
        slug: 'am-shorts-white',
        title: 'AM SHORTS — WHITE',
        titleHe: 'מכנסי פוטר לבנים',
        category: 'shorts',
        cut: 'shorts',
        tone: 'white',
        photo: '/images/products/shorts-white.jpg',
        price: 229,
        compareAtPrice: null,
        badge: null,
        featured: true,
        shortDescription: 'אותם מכנסיים בלבן, עם קצוות שרוך בזהב מוברש.',
        description:
            'הגרסה הלבנה. אותו פוטר כבד ואותה גזרה, בלבן שמחזיק את הצורה. השרוך והקצוות בזהב מוברש, והלוגו רקום על הרגל השמאלית.',
        details: [
            'פוטר 80% כותנה, 20% פוליאסטר, 320 גרם למ״ר',
            'מוברש מבפנים',
            'שרוך עם קצוות זהב מוברש',
            'שני כיסים צדדיים עמוקים',
            'רקמת זהב על הרגל השמאלית'
        ],
        colors: [{ name: 'לבן', hex: '#f3f1ec' }],
        sizes: SIZES
    },
    {
        slug: 'am-set-black',
        title: 'AM SET — BLACK',
        titleHe: 'סט שחור מלא',
        category: 'sets',
        cut: 'tee',
        tone: 'black',
        photo: '/images/products/tee-black.jpg',
        price: 369,
        compareAtPrice: 408,
        badge: 'חיסכון ₪39',
        featured: true,
        shortDescription: 'הטי והמכנסיים בשחור, יחד — במחיר נמוך מרכישה בנפרד.',
        description:
            'הסט המלא בשחור: חולצת הטי ומכנסי הפוטר, באותה מידה או בשתי מידות שונות לבחירתך. אותם פריטים בדיוק, במחיר נמוך מרכישה בנפרד.',
        details: [
            'כולל חולצת טי ומכנסי פוטר',
            'אפשר לבחור מידות שונות לכל פריט בהערה בהזמנה',
            'זהה לפריטים הנמכרים בנפרד',
            'נשלח באריזת מתנה'
        ],
        colors: [{ name: 'שחור', hex: '#151517' }],
        sizes: SIZES
    },
    {
        slug: 'am-set-white',
        title: 'AM SET — WHITE',
        titleHe: 'סט לבן מלא',
        category: 'sets',
        cut: 'shorts',
        tone: 'white',
        photo: '/images/products/shorts-white.jpg',
        price: 369,
        compareAtPrice: 408,
        badge: 'חיסכון ₪39',
        featured: false,
        shortDescription: 'הטי והמכנסיים בלבן, יחד — במחיר נמוך מרכישה בנפרד.',
        description:
            'הסט המלא בלבן: חולצת הטי ומכנסי הפוטר. הלוק הנקי ביותר של הקולקציה, ובמחיר נמוך מרכישה בנפרד.',
        details: [
            'כולל חולצת טי ומכנסי פוטר',
            'אפשר לבחור מידות שונות לכל פריט בהערה בהזמנה',
            'זהה לפריטים הנמכרים בנפרד',
            'נשלח באריזת מתנה'
        ],
        colors: [{ name: 'לבן', hex: '#f3f1ec' }],
        sizes: SIZES
    }
];
