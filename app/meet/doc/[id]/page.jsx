import { notFound } from 'next/navigation';
import { getDoc } from 'lib/meet/store';
import { PrintButton } from './print-button';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const doc = await getDoc((await params).id);
    return { title: doc?.title ?? 'דף עבודה', robots: { index: false } };
}

// A worksheet the bot wrote. The link is what gets emailed and posted in the
// meeting chat, so it opens without signing in; the id is long and random.
// Laid out as a page to print: dark text on white.
export default async function DocPage({ params }) {
    const doc = await getDoc((await params).id);
    if (!doc) notFound();
    const rtl = ['he', 'ar'].includes(doc.language);
    return (
        <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-[100dvh] bg-slate-100 print:bg-white font-hebrew text-slate-900">
            <article className="max-w-3xl px-6 py-10 mx-auto bg-white sm:px-12 sm:my-8 sm:rounded-2xl sm:shadow print:shadow-none print:my-0">
                <h1 className="text-3xl font-extrabold text-balance">{doc.title}</h1>
                {doc.intro && <p className="mt-4 text-lg leading-relaxed text-slate-700">{doc.intro}</p>}
                {doc.sections.map((section, index) => (
                    <section key={index} className="mt-8">
                        <h2 className="text-xl font-bold">{section.heading}</h2>
                        <p className="mt-2 leading-relaxed whitespace-pre-wrap text-slate-800">{section.body}</p>
                    </section>
                ))}
                {doc.questions.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-xl font-bold">{rtl ? 'שאלות' : 'Questions'}</h2>
                        <ol className="mt-3 space-y-6 list-decimal ps-6">
                            {doc.questions.map((question, index) => (
                                <li key={index} className="leading-relaxed">
                                    {question}
                                    <div className="h-10 mt-2 border-b border-slate-300" />
                                </li>
                            ))}
                        </ol>
                    </section>
                )}
                {doc.closing && <p className="pt-6 mt-8 italic border-t border-slate-200 text-slate-600">{doc.closing}</p>}
                <PrintButton label={rtl ? 'הדפסה' : 'Print'} />
            </article>
        </div>
    );
}
