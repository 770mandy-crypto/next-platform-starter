import { readTwilioForm, xmlResponse } from 'lib/sales/twilio';
import { handleOutboundAnswer } from 'lib/sales/voice';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const params = await readTwilioForm(request);
        return xmlResponse(await handleOutboundAnswer(new URL(request.url).searchParams.get('call'), params));
    } catch (error) {
        return new Response(error.message, { status: error.status ?? 400 });
    }
}
