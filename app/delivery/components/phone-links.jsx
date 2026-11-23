// המרת מספר טלפון ישראלי לפורמט בינלאומי עבור ווטסאפ (wa.me)
function toWhatsApp(phone) {
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '972' + digits.slice(1);
    return digits;
}

export function PhoneLinks({ phone }) {
    if (!phone) return null;
    const wa = toWhatsApp(phone);
    return (
        <span className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-white/80">📞 {phone}</span>
            <a href={`tel:${phone}`} className="text-primary no-underline hover:opacity-80">
                חייג
            </a>
            <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 no-underline hover:opacity-80"
            >
                וואטסאפ
            </a>
        </span>
    );
}
