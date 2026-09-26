import { NextResponse } from 'next/server';
import { isClaudeConfigured } from 'lib/pilot/ai';

export const dynamic = 'force-dynamic';

export function GET() {
    return NextResponse.json({ mode: isClaudeConfigured() ? 'claude' : 'demo' });
}
