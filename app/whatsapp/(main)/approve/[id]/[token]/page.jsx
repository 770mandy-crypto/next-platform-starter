import { notFound } from 'next/navigation';
import { formatPrice, loadForApproval, publicPurchase, statusText } from 'lib/whatsapp/purchases';
import { ApproveForm } from './approve-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'אישור רכישה', robots: { index: false } };

export default async function ApprovePage({ params }) {
    const { id, token } = await params;
    const found = await loadForApproval(id, token);
    if (!found) notFound();
    const purchase = publicPurchase(found);

    return (
        <main className="mx-auto max-w-md px-5 py-10">
            <h1 className="mb-6 text-3xl font-black">אישור רכישה</h1>
            <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 p-5">
                <div>
                    <div className="text-sm text-slate-500">מה קונים</div>
                    <div className="text-lg font-bold">{purchase.item}</div>
                </div>
                <div className="flex gap-8">
                    <div>
                        <div className="text-sm text-slate-500">מחיר</div>
                        <div className="text-2xl font-black">{formatPrice(purchase.priceIls)} ₪</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">חנות</div>
                        <div className="font-bold">{purchase.store}</div>
                    </div>
                </div>
                <div>
                    <div className="text-sm text-slate-500">כתובת האתר שבו תשלם</div>
                    <div dir="ltr" className="break-all text-right font-mono text-sm font-bold">
                        {purchase.host}
                    </div>
                </div>
                {purchase.notes && <p className="text-slate-600">{purchase.notes}</p>}
            </div>

            {purchase.status === 'pending' ? (
                <>
                    <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                        לפני שמאשרים, כדאי לוודא שהכתובת למעלה היא של החנות שהתכוונת אליה. העוזר לא משלם בעצמו: אחרי האישור יישלח אליך קישור,
                        והתשלום נעשה באתר החנות.
                    </p>
                    <ApproveForm id={purchase.id} token={token} attemptsLeft={purchase.attemptsLeft} />
                </>
            ) : (
                <p className="rounded-xl bg-slate-100 p-4 text-center font-bold">{statusText(purchase.status)}</p>
            )}
        </main>
    );
}
