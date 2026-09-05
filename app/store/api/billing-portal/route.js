import { NextResponse } from 'next/server';
import { isStripeConfigured, getStripe } from 'lib/stripe';
import { getCurrentUser } from 'lib/store/current-user';

export const runtime = 'nodejs';

// Opens Stripe's own hosted page for viewing, replacing, or removing a saved
// card. We never build our own card form or see the card number — Stripe does
// all of that, which is also what keeps us out of PCI-compliance scope.
export async function POST(request) {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: 'התשלומים עוד לא מוגדרים.' }, { status: 503 });
  }

  const { user, profile } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'יש להתחבר קודם.' }, { status: 401 });
  }
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'עדיין אין אמצעי תשלום שמור — הוא נשמר אוטומטית בהזמנה הראשונה.' }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/store/account`
  });

  return NextResponse.json({ url: session.url });
}
