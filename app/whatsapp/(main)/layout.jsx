export default function WhatsAppLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew flex min-h-[100dvh] flex-col bg-white text-slate-900">
            <header className="border-b border-slate-100">
                <div className="mx-auto flex max-w-4xl items-center px-5 py-3">
                    <a href="/whatsapp" className="text-xl font-black text-slate-900 no-underline">
                        💬 עוזר בוואטסאפ
                    </a>
                    <a href="/whatsapp/simulator" className="ms-auto rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white no-underline hover:bg-emerald-700">
                        לנסות עכשיו
                    </a>
                </div>
            </header>
            <div className="flex-1">{children}</div>
        </div>
    );
}
