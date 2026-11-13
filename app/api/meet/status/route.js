import { NextResponse } from 'next/server';
import { isBrainConfigured } from 'lib/meet/brain';
import { isSpeechConfigured } from 'lib/meet/engine';
import { publicUrl } from 'lib/meet/http';
import { isRecallConfigured } from 'lib/meet/recall';

export const dynamic = 'force-dynamic';

// Which of the bot's three services have a key on this site. No keys are
// returned, only whether each is set.
export async function GET(request) {
    return NextResponse.json(
        {
            recall: isRecallConfigured(),
            brain: isBrainConfigured(),
            speech: isSpeechConfigured(),
            reachable: /^https:\/\//.test(publicUrl(request)),
            signedHooks: Boolean(process.env.RECALL_WEBHOOK_SECRET)
        },
        { headers: { 'cache-control': 'no-store' } }
    );
}
