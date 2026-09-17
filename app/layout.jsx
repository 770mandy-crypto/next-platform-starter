import '../styles/globals.css';

export const metadata = {
    title: {
        template: '%s | Adigo',
        default: 'Adigo — העוזר האישי שלך בעברית'
    },
    description: 'עוזר AI בעברית שעונה על הכול, ויוצר מודעות מוכנות לעסק שלך.'
};

export default function RootLayout({ children }) {
    return (
        <html lang="he" dir="rtl">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Rubik:wght@500;600;700&display=swap"
                />
            </head>
            <body
                className="antialiased bg-white"
                style={{ fontFamily: '"Assistant", "Arial Hebrew", system-ui, sans-serif' }}
            >
                {children}
            </body>
        </html>
    );
}
