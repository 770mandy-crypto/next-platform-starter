import '../styles/globals.css';

export const metadata = {
    title: {
        template: '%s | VALENTOS',
        default: 'VALENTOS CLOTHING — קולקציית 2026'
    },
    description:
        'VALENTOS CLOTHING — קולקציית פתיחה בסדרה מוגבלת. חולצות ומכנסי פוטר בשחור ולבן, עם רקמת זהב.'
};

export default function RootLayout({ children }) {
    return (
        <html lang="he" dir="rtl">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="antialiased" style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
                {children}
            </body>
        </html>
    );
}
