import { readTwilioForm } from 'lib/sales/twilio';
import { handleStatus } from 'lib/sales/voice';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Twilio status callback: finishes the call record (summary, cost, outcome).
export async function POST(request) {
    try {
        const params = await readTwilioForm(request);
        await handleStatus(new URL(request.url).searchParams.get('call'), params);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error('sales status webhook failed:', error);
        return new Response(error.message, { status: error.status ?? 500 });
    }
}
