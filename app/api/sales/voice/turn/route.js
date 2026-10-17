import { readTwilioForm, xmlResponse } from 'lib/sales/twilio';
import { handleTurn } from 'lib/sales/voice';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Each <Gather> posts the caller's words here and gets the agent's reply.
export async function POST(request) {
    try {
        const params = await readTwilioForm(request);
        const url = new URL(request.url);
        return xmlResponse(
            await handleTurn(url.searchParams.get('call'), params, { silence: url.searchParams.get('silence') === '1' })
        );
    } catch (error) {
        return new Response(error.message, { status: error.status ?? 400 });
    }
}
