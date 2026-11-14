export const metadata = {
    title: { template: '%s | עוזר בוואטסאפ', default: 'עוזר אישי בוואטסאפ' },
    description: 'עוזר אישי שחי בוואטסאפ: תזכורות שמגיעות בזמן, רשימות קניות ומשימות, קריאת חשבונות ומכתבים מתמונה, והבנת הודעות קוליות.'
};

export default function WhatsAppLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew flex min-h-[100dvh] flex-col bg-white text-slate-900">
            <header className="border-b border-slate-100">
                <div className="mx-auto flex max-w-4xl items-center px-5 py-3">
                    <a href="/whatsapp" className="text-xl font-black text-slate-900 no-underline">
                        💬 עוזר בוואטסאפ
                    </a>
                </div>
            </header>
            <div className="flex-1">{children}</div>
        </div>
    );
}
