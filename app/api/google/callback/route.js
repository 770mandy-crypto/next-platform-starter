import { NextResponse } from 'next/server';
import { consumeState, exchangeCode, saveRefreshToken } from 'lib/google/oauth';

export const dynamic = 'force-dynamic';

// Google sends the browser back here. The state says who started the connect,
// so the account is saved to that person, whatever the browser sends.
export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const back = (result) => NextResponse.redirect(new URL(`/agents/inbox?google=${result}`, request.url));
    if (params.get('error')) return back('denied');
    const userId = await consumeState(params.get('state'));
    if (!userId || !params.get('code')) return back('expired');
    try {
        const tokens = await exchangeCode(params.get('code'));
        if (!tokens.refresh_token) return back('no-refresh-token');
        await saveRefreshToken(userId, tokens.refresh_token);
        return back('connected');
    } catch (error) {
        console.error('Google connect failed:', error);
        return back('failed');
    }
}
