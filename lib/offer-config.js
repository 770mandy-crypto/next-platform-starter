// All the editable content of the scratch-card offer page lives here:
// brand name, the discount revealed under the card, and the plans for sale.
// Prices are in agorot (₪1 = 100), because that is what Stripe expects.

export const offer = {
    brand: 'כושר בבית',
    tagline: 'תוכנית אימוני משקל גוף אישית',
    discountPercent: 60,
    // How long the "discount reserved" countdown runs after the card is scratched.
    countdownMinutes: 10,
    currency: 'ils',
    plans: [
        {
            id: 'week',
            name: 'שבוע ניסיון',
            fullPrice: 4990,
            perDayNote: 'להכיר את התוכנית'
        },
        {
            id: 'month',
            name: 'תוכנית 4 שבועות',
            fullPrice: 9990,
            perDayNote: 'הכי פופולרי',
            popular: true
        },
        {
            id: 'quarter',
            name: 'תוכנית 12 שבועות',
            fullPrice: 19990,
            perDayNote: 'המחיר הכי משתלם ליום'
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
