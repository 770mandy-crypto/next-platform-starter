// Phone numbers are stored in E.164 (+972501234567) so the do-not-call list,
// lead de-duplication and the telephony provider all agree on one spelling.

const COUNTRY_CODES = { IL: '972', US: '1', CA: '1', GB: '44', DE: '49', FR: '33', ES: '34', IT: '39', AU: '61' };

export function normalisePhone(raw, country = 'IL') {
    let value = String(raw ?? '').trim();
    if (!value) return null;
    value = value.replace(/[\s\-().]/g, '');
    if (value.startsWith('00')) value = `+${value.slice(2)}`;
    if (!value.startsWith('+')) {
        const code = COUNTRY_CODES[String(country).toUpperCase()];
        if (!code) return null;
        // National format: drop the trunk prefix "0" (not used in NANP numbers).
        const national = code === '1' ? value.replace(/^1/, '') : value.replace(/^0/, '');
        value = `+${code}${national}`;
    }
    return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

// For logs and lists that do not need the full number.
export function maskPhone(phone) {
    const value = String(phone ?? '');
    return value.length > 6 ? `${value.slice(0, 4)}•••${value.slice(-3)}` : value;
}
