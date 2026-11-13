'use client';

export function PrintButton({ label }) {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2.5 mt-8 font-bold text-white rounded-xl bg-emerald-600 hover:bg-emerald-700 print:hidden"
        >
            {label}
        </button>
    );
}
