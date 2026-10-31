// Grow (Meshulam) "Light" API: open a hosted payment page, and confirm the
// server-to-server update Grow sends once a payment goes through.
//
// Settings (Netlify → Site configuration → Environment variables):
//   GROW_PAGE_CODE  – the payment page code Grow gives you
//   GROW_USER_ID    – your business user id at Grow
//   GROW_API_KEY    – only if Grow gave you one (some accounts need it)
//   GROW_ENV        – "production" for real money; anything else uses the sandbox

const BASE = {
    sandbox: 'https://sandbox.meshulam.co.il/api/light/server/1.0',
    production: 'https://secure.meshulam.co.il/api/light/server/1.0'
};

export function growConfig() {
    const pageCode = process.env.GROW_PAGE_CODE;
    const userId = process.env.GROW_USER_ID;
    if (!pageCode || !userId) return null;
    return {
        pageCode,
        userId,
        apiKey: process.env.GROW_API_KEY || '',
        base: process.env.GROW_ENV === 'production' ? BASE.production : BASE.sandbox
    };
}

async function call(config, action, fields) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
    }
    const res = await fetch(`${config.base}/${action}`, { method: 'POST', body: form });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`Grow ${action}: unexpected response (${res.status})`);
    }
    if (String(data.status) !== '1') {
        const message = typeof data.err === 'object' ? data.err?.message : data.err;
        throw new Error(`Grow ${action}: ${message || 'failed'}`);
    }
    return data.data;
}

// Returns the URL of Grow's payment page for this purchase.
export async function createPaymentProcess(config, { sum, description, fullName, phone, email, successUrl, cancelUrl, notifyUrl, planId }) {
    const data = await call(config, 'createPaymentProcess', {
        pageCode: config.pageCode,
        userId: config.userId,
        apiKey: config.apiKey,
        sum,
        description,
        successUrl,
        cancelUrl,
        notifyUrl,
        'pageField[fullName]': fullName,
        'pageField[phone]': phone,
        'pageField[email]': email,
        cField1: planId
    });
    if (!data?.url) throw new Error('Grow createPaymentProcess: no payment URL returned');
    return data.url;
}

// Grow expects every server update to be acknowledged with approveTransaction;
// it sends back the transaction fields it received.
export async function approveTransaction(config, transaction) {
    return call(config, 'approveTransaction', { ...transaction, pageCode: config.pageCode });
}
