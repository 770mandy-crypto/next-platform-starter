// Netlify scheduled function: every 15 minutes, dial due leads for every
// business with outbound calling on. Does nothing unless SALES_SCHEDULER=on,
// so deploying the site never starts calling people by itself.
export default async function salesDispatch() {
    if (process.env.SALES_SCHEDULER !== 'on' || !process.env.SALES_CRON_SECRET || !process.env.PUBLIC_BASE_URL) return;
    const response = await fetch(`${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/sales/outbound/dispatch`, {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.SALES_CRON_SECRET}` }
    });
    console.log('sales dispatch', response.status, await response.text());
}

export const config = { schedule: '*/15 * * * *' };
