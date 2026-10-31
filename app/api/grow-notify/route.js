import { approveTransaction, growConfig } from 'lib/grow';
import { sendProgramEmail } from 'lib/mailer';
import { findPlan } from 'lib/offer-config';

// Grow calls this address (notifyUrl) from its servers after a successful
// payment. We acknowledge it with approveTransaction and then email the
// program to the buyer. The email goes out only after Grow accepts the
// approval, so a forged request to this address does not send the program.

// Remembers which transactions already got their email, because Grow may send
// the same update more than once. Returns false if this one was handled.
async function claimTransaction(transactionId) {
    try {
        const { getStore } = await import('@netlify/blobs');
        const store = getStore({ name: 'offer-orders', consistency: 'strong' });
        const result = await store.set(transactionId, JSON.stringify({ at: new Date().toISOString() }), { onlyIfNew: true });
        return {
            fresh: result?.modified !== false,
            release: () => store.delete(transactionId)
        };
    } catch (err) {
        // Outside Netlify (local dev) there is no Blobs store; send anyway.
        console.warn('Order store unavailable, duplicate emails are possible:', err.message);
        return { fresh: true, release: async () => {} };
    }
}

export async function POST(request) {
    const config = growConfig();
    if (!config) return new Response('not configured', { status: 503 });

    // Fields arrive as data[transactionId], data[customFields][cField2], ...
    // The approval needs the top-level data[...] fields; for reading we also
    // keep the innermost name of nested ones.
    const transaction = {};
    const fields = {};
    try {
        const form = await request.formData();
        for (const [key, value] of form.entries()) {
            const top = key.match(/^data\[([^\]]+)\]$/);
            if (top) transaction[top[1]] = value;
            const inner = key.match(/\[([^\]]+)\]$/);
            fields[inner ? inner[1] : key] = value;
        }
    } catch {
        return new Response('bad request', { status: 400 });
    }

    const transactionId = transaction.transactionId;
    if (!transactionId) return new Response('missing transaction', { status: 400 });

    const plan = findPlan(fields.cField1);
    const email = fields.cField2 || fields.payerEmail || fields.email;
    const name = fields.fullName || fields.payerName || '';
    console.log('Grow payment received', { transactionId, sum: transaction.sum, plan: plan?.id, email });

    try {
        await approveTransaction(config, transaction);
    } catch (err) {
        console.error(err.message);
        return new Response('approve failed', { status: 502 });
    }

    if (!plan || !email) {
        console.error('Paid order without plan or email – send the program manually', { transactionId, fields });
        return new Response('ok');
    }

    const claim = await claimTransaction(transactionId);
    if (!claim.fresh) return new Response('ok');

    try {
        await sendProgramEmail({ to: email, name, plan, siteUrl: new URL(request.url).origin });
        console.log('Program email sent', { transactionId, email });
    } catch (err) {
        // Let a retry from Grow try again, and leave a clear trace in the logs.
        await claim.release().catch(() => {});
        console.error('Program email FAILED – send it manually', { transactionId, email, plan: plan.id, error: err.message });
        return new Response('email failed', { status: 502 });
    }
    return new Response('ok');
}
