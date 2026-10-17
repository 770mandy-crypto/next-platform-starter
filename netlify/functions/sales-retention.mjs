// Netlify scheduled function: daily, delete transcripts older than each
// business's retention period.
export default async function salesRetention() {
    if (!process.env.SALES_CRON_SECRET || !process.env.PUBLIC_BASE_URL) return;
    const response = await fetch(`${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/sales/maintenance/purge`, {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.SALES_CRON_SECRET}` }
    });
    console.log('sales retention', response.status, await response.text());
}

export const config = { schedule: '@daily' };
