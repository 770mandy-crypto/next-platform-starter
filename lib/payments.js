/**
 * Master switch for taking money.
 *
 * While this is false the shop records orders and settles with the customer
 * directly; no payment provider is contacted and no card details are ever
 * requested. Flip it to true only when the owner asks for online payment to
 * go live — and only once Stripe keys are configured.
 *
 * Deliberately a constant and not an environment variable, so payment cannot
 * be switched on by a stray setting in a hosting dashboard.
 */
export const PAYMENTS_ENABLED = false;

export function paymentsDisabledResponse() {
    return Response.json(
        { error: 'התשלום המקוון סגור. ההזמנה מתקבלת ואנחנו חוזרים אליך לתיאום התשלום.', paymentsEnabled: false },
        { status: 503 }
    );
}
