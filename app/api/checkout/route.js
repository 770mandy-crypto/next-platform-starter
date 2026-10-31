import { discountedPrice, findPlan, offer } from 'lib/offer-config';
import { createPaymentProcess, growConfig } from 'lib/grow';

// Opens a Grow (Meshulam) payment page for one plan and returns its URL.
// The price is always worked out here on the server from the plan id, so a
// visitor cannot change what they pay by editing the page.
export async function POST(request) {
    const config = growConfig();
    if (!config) {
        return Response.json(
            { error: 'התשלום עוד לא הוגדר: חסרים GROW_PAGE_CODE ו-GROW_USER_ID בהגדרות האתר.' },
            { status: 503 }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const plan = findPlan(body?.planId);
    if (!plan) return Response.json({ error: 'תוכנית לא קיימת' }, { status: 400 });

    const fullName = String(body.fullName || '').trim().replace(/\s+/g, ' ');
    const phone = String(body.phone || '').replace(/[\s-]/g, '');
    const email = String(body.email || '').trim();
    // Grow requires a first and last name and an Israeli mobile number.
    if (fullName.split(' ').length < 2) {
        return Response.json({ error: 'נא למלא שם פרטי ושם משפחה' }, { status: 400 });
    }
    if (!/^05\d{8}$/.test(phone)) {
        return Response.json({ error: 'נא למלא מספר נייד תקין (05XXXXXXXX)' }, { status: 400 });
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return Response.json({ error: 'כתובת המייל לא תקינה' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || new URL(request.url).origin;
    try {
        const url = await createPaymentProcess(config, {
            sum: (discountedPrice(plan) / 100).toFixed(2),
            description: `${offer.brand} – ${plan.name}`,
            fullName,
            phone,
            email,
            planId: plan.id,
            successUrl: `${origin}/offer/success`,
            cancelUrl: `${origin}/offer`,
            notifyUrl: `${origin}/api/grow-notify`
        });
        return Response.json({ url });
    } catch (err) {
        console.error(err.message);
        return Response.json({ error: 'לא הצלחנו לפתוח את דף התשלום. נסו שוב.' }, { status: 502 });
    }
}
