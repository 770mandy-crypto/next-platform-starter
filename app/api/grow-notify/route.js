import { approveTransaction, growConfig } from 'lib/grow';

// Grow calls this address (notifyUrl) from its servers after a successful
// payment. We log the payment and acknowledge it with approveTransaction.
// To deliver the program automatically (email, access link…), add it here.
export async function POST(request) {
    const config = growConfig();
    if (!config) return new Response('not configured', { status: 503 });

    const transaction = {};
    try {
        const form = await request.formData();
        for (const [key, value] of form.entries()) {
            // Fields arrive as data[transactionId], data[sum], ...; keep the inner name.
            const match = key.match(/^data\[([^\]]+)\]$/);
            if (match) transaction[match[1]] = value;
        }
    } catch {
        return new Response('bad request', { status: 400 });
    }

    if (!transaction.transactionId) return new Response('missing transaction', { status: 400 });

    console.log('Grow payment received', {
        transactionId: transaction.transactionId,
        sum: transaction.sum,
        plan: transaction.cField1,
        name: transaction.fullName
    });

    try {
        await approveTransaction(config, transaction);
    } catch (err) {
        console.error(err.message);
        return new Response('approve failed', { status: 502 });
    }
    return new Response('ok');
}
