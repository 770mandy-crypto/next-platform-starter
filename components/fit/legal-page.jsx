// Shared frame for the terms and privacy pages.
export function LegalPage({ title, children }) {
    return (
        <main className="mx-auto max-w-3xl px-5 py-12">
            <h1 className="mb-2 text-3xl font-extrabold">{title}</h1>
            <p className="mb-8 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                זהו נוסח כללי לדוגמה. מומלץ להעביר אותו לבדיקה של עורך/ת דין לפני שמתחילים למכור.
            </p>
            <div className="space-y-6 leading-relaxed text-slate-700 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900">
                {children}
            </div>
        </main>
    );
}
