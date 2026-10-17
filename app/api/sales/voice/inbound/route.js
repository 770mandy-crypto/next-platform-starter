import { readTwilioForm, xmlResponse } from 'lib/sales/twilio';
import { handleInbound } from 'lib/sales/voice';

export const dynamic = 'force-dynamic';

// Twilio "A call comes in" webhook for the business's number.
export async function POST(request) {
    try {
        return xmlResponse(await handleInbound(await readTwilioForm(request)));
    } catch (error) {
        return new Response(error.message, { status: error.status ?? 400 });
    }
}
