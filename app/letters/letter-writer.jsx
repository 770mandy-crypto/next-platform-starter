'use client';

import { useEffect, useRef, useState } from 'react';
import { streamResearch } from 'lib/research/client';

const SENDER_KEY = 'letters-sender';
const MAX_FILE = 3_500_000;
const EXAMPLES = {
    parking: 'קיבלתי דוח חניה ברחוב הרצל בחולון ב-3 בנובמבר. חניתי ליד שלט שהיה מכוסה בענפים ולא ראו אותו בכלל. צילמתי את השלט. אני רוצה לבטל את הדוח.',
    insurance: 'חברת הביטוח דחתה את התביעה שלי על נזק מים בדירה בטענה שזה "בלאי". האינסטלטור כתב שהצינור התפוצץ פתאום. אני רוצה שיאשרו את התביעה.',
    refund: 'הזמנתי ספה באינטרנט לפני 5 ימים ועוד לא סופקה. אני רוצה לבטל את העסקה ולקבל את כל הכסף בחזרה.'
};

const blankSender = { name: '', id: '', address: '', phone: '', email: '' };

function loadSender() {
    try {
        return { ...blankSender, ...JSON.parse(localStorage.getItem(SENDER_KEY) || '{}'), id: '' };
    } catch {
        return blankSender;
    }
}

function saveSender(sender) {
    try {
        // Everything but the ID number, which is never kept.
        const { id, ...rest } = sender;
        localStorage.setItem(SENDER_KEY, JSON.stringify(rest));
    } catch {}
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('לא הצלחתי לקרוא את הקובץ.'));
        reader.readAsDataURL(file);
    });
}

// Placeholders like [מספר הדוח] are highlighted so they are not missed.
function Fill({ text }) {
    return String(text)
        .split(/(\[[^\]\n]{1,60}\])/g)
        .map((part, i) =>
            /^\[.*\]$/.test(part) ? (
                <mark key={i} className="rounded bg-amber-200 px-0.5">
                    {part}
                </mark>
            ) : (
                <span key={i}>{part}</span>
            )
        );
}

export function LetterWriter({ kinds }) {
    const [kind, setKind] = useState('parking');
    const [situation, setSituation] = useState('');
    const [recipientHint, setRecipientHint] = useState('');
    const [sender, setSender] = useState(blankSender);
    const [file, setFile] = useState(null);
    const [phase, setPhase] = useState('form'); // form | working | done
    const [progress, setProgress] = useState({ searches: 0, sources: [], writing: false });
    const [letter, setLetter] = useState(null);
    const [error, setError] = useState(null);
    const abort = useRef(null);

    useEffect(() => setSender(loadSender()), []);

    async function submit(event) {
        event.preventDefault();
        setError(null);
        if (file && file.size > MAX_FILE) return setError('הקובץ גדול מדי (עד 3.5MB). אפשר לצלם שוב ברזולוציה נמוכה יותר.');
        saveSender(sender);
        let attachment = null;
        try {
            if (file) attachment = { name: file.name, type: file.type, data: await readFile(file) };
        } catch (err) {
            return setError(err.message);
        }
        setPhase('working');
        setProgress({ searches: 0, sources: [], writing: false });
        setLetter(null);
        abort.current = new AbortController();
        let result = null;
        try {
            await streamResearch(
                '/api/letters',
                { kind, situation, recipientHint, senderName: sender.name, attachment },
                (e) => {
                    if (e.type === 'searching' || e.type === 'reading') setProgress((p) => ({ ...p, searches: p.searches + 1 }));
                    else if (e.type === 'source') setProgress((p) => ({ ...p, sources: [...p.sources, { url: e.url, title: e.title }].slice(-6) }));
                    else if (e.type === 'writing') setProgress((p) => ({ ...p, writing: true }));
                    else if (e.type === 'letter') result = e.letter;
                    else if (e.type === 'refused') throw new Error('לא ניתן לכתוב את המכתב הזה.');
                    else if (e.type === 'failed') throw new Error('כתיבת המכתב נכשלה. נסו שוב.');
                },
                abort.current.signal
            );
            if (!result) throw new Error('החיבור נקטע לפני שהמכתב הושלם. נסו שוב.');
            setLetter(result);
            setPhase('done');
        } catch (err) {
            if (err.name === 'AbortError') return setPhase('form');
            setError(err.message);
            setPhase('form');
        }
    }

    if (phase === 'done' && letter) {
        return <Result letter={letter} sender={sender} onBack={() => setPhase('form')} />;
    }

    return (
        <main className="mx-auto max-w-3xl px-5 py-10">
            <section className="mb-8 text-center">
                <h1 className="mb-3 text-4xl font-black leading-tight sm:text-5xl">מכתב רשמי, מוכן לשליחה</h1>
                <p className="mx-auto max-w-xl text-lg text-slate-600">
                    מספרים מה קרה. הסוכן בודק ברשת מה הזכויות שלכם ולמי פונים, וכותב מכתב מנומק שאפשר לערוך, להדפיס או לשמור כ-PDF.
                </p>
            </section>

            {phase === 'working' ? (
                <Working progress={progress} onCancel={() => abort.current?.abort()} />
            ) : (
                <form onSubmit={submit} className="space-y-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
                    <fieldset>
                        <legend className="mb-2 font-bold">על מה המכתב?</legend>
                        <div className="flex flex-wrap gap-2">
                            {kinds.map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setKind(id)}
                                    className={`rounded-full border px-3 py-1.5 text-sm ${
                                        kind === id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-stone-300 bg-white hover:border-indigo-400'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <label className="block">
                        <span className="mb-1 block font-bold">מה קרה, ומה אתם רוצים להשיג?</span>
                        <textarea
                            value={situation}
                            onChange={(e) => setSituation(e.target.value)}
                            rows={6}
                            required
                            minLength={15}
                            placeholder="כתבו בחופשיות, עם תאריכים, סכומים ומספרים אם יש."
                            className="w-full rounded-xl border border-stone-300 p-3 leading-relaxed"
                        />
                        {!situation && EXAMPLES[kind] && (
                            <button type="button" onClick={() => setSituation(EXAMPLES[kind])} className="mt-1 text-sm text-indigo-700 underline">
                                למלא דוגמה
                            </button>
                        )}
                    </label>

                    <label className="block">
                        <span className="mb-1 block font-bold">
                            למי? <span className="font-normal text-slate-500">(לא חובה)</span>
                        </span>
                        <input
                            value={recipientHint}
                            onChange={(e) => setRecipientHint(e.target.value)}
                            placeholder="למשל: עיריית חולון, הראל ביטוח"
                            className="w-full rounded-xl border border-stone-300 p-3"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block font-bold">
                            מסמך רלוונטי <span className="font-normal text-slate-500">(לא חובה: צילום של הדוח, המכתב או הקבלה, או PDF)</span>
                        </span>
                        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
                    </label>

                    <fieldset className="rounded-2xl bg-stone-50 p-4">
                        <legend className="px-1 font-bold">הפרטים שלכם, לראש המכתב</legend>
                        <p className="mb-3 text-sm text-slate-500">
                            רק השם נשלח לסוכן. כל השאר מתווסף למכתב כאן בדפדפן, ותעודת הזהות לא נשמרת בשום מקום.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                ['name', 'שם מלא'],
                                ['id', 'ת״ז (לא חובה)'],
                                ['address', 'כתובת'],
                                ['phone', 'טלפון'],
                                ['email', 'אימייל']
                            ].map(([field, label]) => (
                                <input
                                    key={field}
                                    value={sender[field]}
                                    onChange={(e) => setSender({ ...sender, [field]: e.target.value })}
                                    placeholder={label}
                                    aria-label={label}
                                    inputMode={field === 'id' || field === 'phone' ? 'numeric' : undefined}
                                    dir={field === 'email' ? 'ltr' : undefined}
                                    className="rounded-xl border border-stone-300 p-2.5"
                                />
                            ))}
                        </div>
                    </fieldset>

                    {error && <p className="rounded-xl bg-rose-50 p-3 font-bold text-rose-800">{error}</p>}

                    <button type="submit" className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-black text-white hover:bg-indigo-700">
                        לכתוב את המכתב
                    </button>
                    <p className="text-center text-xs text-slate-500">
                        המכתב והמידע על הזכויות נכתבים על ידי בינה מלאכותית ואינם ייעוץ משפטי. כדאי לקרוא ולבדוק לפני שליחה.
                    </p>
                </form>
            )}
        </main>
    );
}

function Working({ progress, onCancel }) {
    return (
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 size-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mb-1 text-xl font-bold">{progress.writing ? 'כותב את המכתב…' : 'בודק את הזכויות שלך ברשת…'}</p>
            <p className="mb-5 text-sm text-slate-500">זה לוקח בדרך כלל דקה או שתיים.</p>
            {progress.sources.length > 0 && (
                <ul className="mx-auto mb-5 max-w-md space-y-1 text-right text-sm text-slate-600">
                    {progress.sources.map((s) => (
                        <li key={s.url} className="truncate">
                            📄 {s.title}
                        </li>
                    ))}
                </ul>
            )}
            <button type="button" onClick={onCancel} className="text-sm text-slate-500 underline">
                ביטול
            </button>
        </div>
    );
}

function Result({ letter, sender, onBack }) {
    const sheet = useRef(null);
    const [copied, setCopied] = useState(false);
    const today = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    async function copy() {
        try {
            await navigator.clipboard.writeText(sheet.current.innerText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    }

    // Word opens an HTML file saved as .doc, right-to-left and editable.
    function downloadWord() {
        const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><style>body{font-family:David,Arial,sans-serif;font-size:12pt;line-height:1.6;direction:rtl}mark{background:#fde68a}</style></head><body>${sheet.current.innerHTML}</body></html>`;
        const url = URL.createObjectURL(new Blob(['﻿', html], { type: 'application/msword' }));
        const link = document.createElement('a');
        link.href = url;
        // A Latin name: some browsers drop non-Latin download names.
        link.download = `letter-${new Date().toISOString().slice(0, 10)}.doc`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Revoked later: revoking at once can cancel the download's name.
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }

    const senderLines = [
        sender.name,
        sender.id && `ת״ז ${sender.id}`,
        sender.address,
        sender.phone && `טל׳ ${sender.phone}`,
        sender.email
    ].filter(Boolean);

    return (
        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
            <style>{`@media print {
                @page { size: A4; margin: 2cm; }
                body * { visibility: hidden; }
                .letter-sheet, .letter-sheet * { visibility: visible; }
                .letter-sheet { position: absolute; inset: 0; margin: 0; padding: 0; box-shadow: none; border: 0; width: auto; }
                .letter-sheet mark { background: none; }
            }`}</style>

            <div>
                <div className="mb-3 flex flex-wrap gap-2 print:hidden">
                    <button type="button" onClick={() => window.print()} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                        הדפסה / שמירה כ-PDF
                    </button>
                    <button type="button" onClick={downloadWord} className="rounded-xl bg-white px-4 py-2 font-bold shadow-sm ring-1 ring-stone-300">
                        הורדה ל-Word
                    </button>
                    <button type="button" onClick={copy} className="rounded-xl bg-white px-4 py-2 font-bold shadow-sm ring-1 ring-stone-300">
                        {copied ? 'הועתק ✓' : 'העתקת הטקסט'}
                    </button>
                    <button type="button" onClick={onBack} className="ms-auto rounded-xl px-4 py-2 text-slate-600 underline">
                        לתקן את הפרטים ולכתוב מחדש
                    </button>
                </div>
                <p className="mb-2 text-sm text-slate-500 print:hidden">✏️ אפשר ללחוץ על כל מקום במכתב ולערוך אותו ישירות.</p>

                <article
                    ref={sheet}
                    contentEditable
                    suppressContentEditableWarning
                    className="letter-sheet min-h-[29.7cm] rounded-sm bg-white p-8 leading-relaxed shadow-md outline-none ring-indigo-300 focus:ring-2 sm:p-14"
                    style={{ fontFamily: 'David, "Frank Ruhl Libre", "Times New Roman", serif', fontSize: '13pt' }}
                >
                    <div className="mb-8 flex justify-between gap-6">
                        <div>
                            {senderLines.length ? senderLines.map((line, i) => <div key={i}>{line}</div>) : <mark className="rounded bg-amber-200">[השם והכתובת שלך]</mark>}
                        </div>
                        <div className="shrink-0 text-left">{today}</div>
                    </div>

                    <div className="mb-6">
                        <div>לכבוד</div>
                        <div className="font-bold">{letter.recipient.name}</div>
                        {letter.recipient.department && <div>{letter.recipient.department}</div>}
                        {letter.recipient.address && <div>{letter.recipient.address}</div>}
                    </div>

                    <p className="mb-1 text-center font-bold underline">
                        הנדון: <Fill text={letter.subject} />
                    </p>
                    {letter.reference && (
                        <p className="mb-4 text-center">
                            סימוכין: <Fill text={letter.reference} />
                        </p>
                    )}

                    <p className="mt-6 mb-4">{letter.salutation}</p>
                    {letter.paragraphs.map((paragraph, i) => (
                        <p key={i} className="mb-4 text-justify">
                            <Fill text={paragraph} />
                        </p>
                    ))}

                    {letter.requests.length > 0 && (
                        <>
                            <p className="mb-2">לאור האמור, אבקש:</p>
                            <ol className="mb-4 list-decimal space-y-1 pr-6">
                                {letter.requests.map((item, i) => (
                                    <li key={i}>
                                        <Fill text={item} />
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}

                    <p className="mt-8">{letter.closing}</p>
                    <p className="mt-10">______________</p>
                    <p>{sender.name || <mark className="rounded bg-amber-200">[שם מלא]</mark>}</p>

                    {letter.enclosures.length > 0 && (
                        <div className="mt-10 text-[11pt]">
                            <div className="font-bold underline">נספחים:</div>
                            <ol className="list-decimal pr-6">
                                {letter.enclosures.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                </article>
            </div>

            <aside className="space-y-4 print:hidden">
                {letter.placeholders.length > 0 && (
                    <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
                        <h2 className="mb-2 font-black">✍️ להשלים לפני שליחה</h2>
                        <ul className="list-disc space-y-1 pr-5 text-sm">
                            {letter.placeholders.map((p) => (
                                <li key={p}>{p}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {letter.guide.deadline && (
                    <div className="rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200">
                        <h2 className="mb-1 font-black">⏳ מועד אחרון</h2>
                        <p className="text-sm">{letter.guide.deadline}</p>
                    </div>
                )}
                <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
                    <h2 className="mb-2 font-black">⚖️ מה הזכויות שלך</h2>
                    <p className="text-sm leading-relaxed text-slate-700">{letter.guide.summary}</p>
                </div>
                {letter.guide.howToSend.length > 0 && (
                    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
                        <h2 className="mb-2 font-black">📮 איך שולחים</h2>
                        <ol className="list-decimal space-y-1 pr-5 text-sm">
                            {letter.guide.howToSend.map((step, i) => (
                                <li key={i}>{step}</li>
                            ))}
                        </ol>
                    </div>
                )}
                {letter.guide.sources.length > 0 && (
                    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
                        <h2 className="mb-2 font-black">🔗 מקורות</h2>
                        <ul className="space-y-1 text-sm">
                            {letter.guide.sources.map((s) => (
                                <li key={s.url}>
                                    <a href={s.url} target="_blank" rel="noreferrer" className="text-indigo-700 underline">
                                        {s.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <p className="text-xs text-slate-500">המכתב נכתב על ידי בינה מלאכותית ואינו ייעוץ משפטי. כדאי לקרוא ולבדוק לפני שליחה.</p>
            </aside>
        </main>
    );
}
