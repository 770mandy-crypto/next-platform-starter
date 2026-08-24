'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ReportView } from './report-view';
import { apiFetch } from 'components/bot/keys';

// A phone screenshot is several megabytes; the function's request body is far
// smaller than that. Downscaling in the browser keeps the upload inside the
// limit and cuts the round trip.
const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.85;

async function downscale(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return { dataUrl, mediaType: 'image/jpeg', data: dataUrl.split(',')[1] };
}

const CONFIDENCE_LABELS = { high: 'זיהוי ודאי', medium: 'זיהוי סביר', low: 'ניחוש בלבד' };
const CONFIDENCE_STYLES = {
    high: 'bg-green-500/20 text-green-200',
    medium: 'bg-yellow-500/20 text-yellow-200',
    low: 'bg-red-500/20 text-red-200'
};

function VisionPanel({ vision, resolvedSymbol, dataError }) {
    return (
        <section className="flex flex-col gap-4 p-6 border rounded-lg border-primary/40 bg-primary/5">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl" aria-hidden="true">
                    👁️
                </span>
                <h3>מה שוקי רואה בתמונה</h3>
                <span className={`px-2 py-0.5 text-xs rounded-full ${CONFIDENCE_STYLES[vision.confidence]}`}>
                    {CONFIDENCE_LABELS[vision.confidence]}
                </span>
            </div>

            {(vision.symbol || vision.companyName) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {vision.companyName && <span className="font-semibold">{vision.companyName}</span>}
                    {vision.symbol && (
                        <span dir="ltr" className="opacity-80">
                            {vision.symbol}
                            {vision.exchange && ` · ${vision.exchange}`}
                        </span>
                    )}
                    {resolvedSymbol && resolvedSymbol !== vision.symbol && (
                        <span className="opacity-60" dir="ltr">
                            → {resolvedSymbol}
                        </span>
                    )}
                </div>
            )}

            <p className="leading-relaxed">{vision.chartReading}</p>

            {vision.visibleFigures?.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-3">
                    {vision.visibleFigures.map((figure) => (
                        <div key={`${figure.label}-${figure.value}`} className="px-3 py-2 rounded bg-white/5">
                            <div className="text-xs opacity-60">{figure.label}</div>
                            <div className="font-semibold" dir="ltr">
                                {figure.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* The distinction that matters: this half is an interpretation of a
                picture, the report below is computed from fetched prices. The two
                can disagree — a screenshot may be old, or in another currency —
                and a reader seeing two different prices deserves to know which
                one to trust. */}
            <p className="text-xs leading-relaxed opacity-60">
                הקריאה הזו מבוססת על מה שנראה בתמונה בלבד, וכל מספר שמופיע כאן נקרא מהצילום ולא נשלף ממקור נתונים.
                {dataError
                    ? ''
                    : ' הניתוח שמתחת מחושב ממחירים שנשלפו עכשיו. אם המספרים שונים — הצילום כנראה ישן או במטבע אחר, והנתונים שלמטה הם העדכניים.'}
            </p>

            {dataError && (
                <div className="p-3 text-sm rounded bg-yellow-500/15 border border-yellow-400/40">
                    {dataError}{' '}
                    <Link href="/setup" className="text-primary">
                        בדוק את הגדרות הנתונים
                    </Link>
                </div>
            )}
        </section>
    );
}

export function ChartUpload() {
    const [preview, setPreview] = useState(null);
    const [state, setState] = useState({ status: 'idle' });
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);

    const analyse = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            setState({ status: 'error', detail: 'זה לא נראה כמו קובץ תמונה.' });
            return;
        }

        setState({ status: 'loading' });
        try {
            const { dataUrl, mediaType, data } = await downscale(file);
            setPreview(dataUrl);

            const response = await apiFetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mediaType, data })
            });
            const payload = await response.json();

            if (!response.ok) {
                setState({ status: 'error', detail: payload.detail || 'הניתוח נכשל.', headline: payload.headline });
                return;
            }
            setState({ status: 'done', payload });
        } catch {
            setState({ status: 'error', detail: 'לא הצלחתי לעבד את התמונה.' });
        }
    }, []);

    // A screenshot usually arrives on the clipboard, so Ctrl+V should just work.
    useEffect(() => {
        function onPaste(event) {
            const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith('image/'));
            if (item) analyse(item.getAsFile());
        }
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [analyse]);

    return (
        <div className="flex flex-col gap-6">
            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    analyse(event.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex flex-col items-center gap-3 p-10 text-center transition border-2 border-dashed rounded-lg cursor-pointer ${
                    dragging ? 'border-primary bg-primary/10' : 'border-white/25 bg-white/5 hover:bg-white/10'
                }`}
            >
                <span className="text-4xl" aria-hidden="true">
                    📈
                </span>
                <div className="font-semibold">גרור לכאן צילום מסך, או לחץ לבחירת קובץ</div>
                <div className="text-sm opacity-70">אפשר גם פשוט להדביק עם Ctrl+V</div>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => analyse(event.target.files?.[0])}
                />
            </div>

            {preview && (
                <div className="flex flex-col gap-2">
                    <div className="text-sm opacity-70">התמונה שהעלית:</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="הצילום שהועלה" className="rounded-lg max-h-72 w-auto self-start" />
                </div>
            )}

            {state.status === 'loading' && (
                <div className="p-6 text-center rounded-lg bg-white/5 animate-pulse">🤖 שוקי מסתכל על התמונה…</div>
            )}

            {state.status === 'error' && (
                <div className="flex flex-col gap-2 p-6 rounded-lg bg-red-500/15 border border-red-400/40">
                    {state.headline && <strong>{state.headline}</strong>}
                    <span>{state.detail}</span>
                    <Link href="/setup" className="self-start text-primary">
                        דף ההגדרות
                    </Link>
                </div>
            )}

            {state.status === 'done' && (
                <>
                    <VisionPanel
                        vision={state.payload.vision}
                        resolvedSymbol={state.payload.resolvedSymbol}
                        dataError={state.payload.dataError}
                    />
                    {state.payload.report && <ReportView report={state.payload.report} />}
                </>
            )}
        </div>
    );
}
