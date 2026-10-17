import { NextResponse } from 'next/server';
import { isAgentConfigured } from 'lib/sales/agent';
import { isDatabaseConfigured } from 'lib/sales/db';
import { isTwilioConfigured } from 'lib/sales/twilio';

export const dynamic = 'force-dynamic';

// Which parts are connected. Reports configuration only, never secrets.
export function GET() {
    return NextResponse.json({
        database: isDatabaseConfigured(),
        ai: isAgentConfigured(),
        telephony: isTwilioConfigured(),
        cronSecret: Boolean(process.env.SALES_CRON_SECRET)
    });
}
