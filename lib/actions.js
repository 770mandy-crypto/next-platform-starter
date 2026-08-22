'use server';

import { createShopifyCheckout, isShopifyConfigured } from 'lib/shopify';

/*
Hand the cart over to Shopify's hosted checkout.

Returns a plain result object rather than redirecting, so the cart page can show a
clear message when the site is still running on the local catalog and there is no
real checkout to send the shopper to.
*/
export async function startCheckout(lines) {
    if (!isShopifyConfigured()) {
        return {
            ok: false,
            reason: 'not-configured',
            message: 'התשלום המקוון עדיין לא חובר. הזמנות מתקבלות כרגע דרך עמוד צור קשר או בוואטסאפ.'
        };
    }

    try {
        const checkoutUrl = await createShopifyCheckout(lines);
        if (!checkoutUrl) {
            return {
                ok: false,
                reason: 'no-variants',
                message: 'הפריטים בעגלה אינם מקושרים עדיין לחנות התשלומים. נשמח לקבל את ההזמנה דרך עמוד צור קשר.'
            };
        }
        return { ok: true, checkoutUrl };
    } catch (error) {
        console.error('Shopify checkout failed:', error.message);
        return {
            ok: false,
            reason: 'error',
            message: 'משהו השתבש במעבר לתשלום. אפשר לנסות שוב עוד רגע או לפנות אלינו.'
        };
    }
}
