// All the editable content of the scratch-card offer page lives here:
// brand name, the discount revealed under the card, and the plans for sale.
// Prices are in agorot (₪1 = 100) so the discount math stays in whole numbers.

export const offer = {
    brand: 'כושר בבית',
    tagline: 'תוכנית אימוני משקל גוף אישית',
    discountPercent: 60,
    // How long the "discount reserved" countdown runs after the card is scratched.
    countdownMinutes: 10,
    // Business details for the site: contact links, footer, terms and privacy.
    // Fill these in before going live; the terms page reads them.
    site: {
        businessName: 'כושר בבית', // legal name as registered (עוסק / חברה)
        businessId: '', // מספר עוסק או ח.פ.
        contactEmail: 'hello@example.com',
        whatsapp: '972500000000', // international format, no + or dashes
        refundDays: 14
    },
    // The email the buyer receives once the payment is confirmed.
    email: {
        subject: 'התוכנית שלך מוכנה 💪',
        intro: 'תודה שהצטרפת! התשלום התקבל והתוכנית שלך מחכה לך בקישור הבא:',
        outro: 'מומלץ לשמור את המייל הזה כדי לחזור לתוכנית בכל זמן. בהצלחה!',
        replyTo: '' // optional: an address buyers can reply to
    },
    plans: [
        {
            id: 'week',
            name: 'שבוע ניסיון',
            fullPrice: 4990,
            perDayNote: 'להכיר את התוכנית',
            // The link sent by email after payment: a PDF in /public, a Google
            // Drive folder, a private video playlist… Replace with your own.
            accessUrl: '/program/week.pdf'
        },
        {
            id: 'month',
            name: 'תוכנית 4 שבועות',
            fullPrice: 9990,
            perDayNote: 'הכי פופולרי',
            accessUrl: '/program/month.pdf',
            popular: true
        },
        {
            id: 'quarter',
            name: 'תוכנית 12 שבועות',
            fullPrice: 19990,
            perDayNote: 'המחיר הכי משתלם ליום',
            accessUrl: '/program/quarter.pdf'
        }
    ]
};

export function discountedPrice(plan) {
    return Math.round((plan.fullPrice * (100 - offer.discountPercent)) / 100);
}

export function formatPrice(agorot) {
    return `₪${(agorot / 100).toFixed(2)}`;
}

export function findPlan(id) {
    return offer.plans.find((plan) => plan.id === id) || null;
}
