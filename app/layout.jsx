import '../styles/globals.css';

export const metadata = {
    title: {
        template: '%s | AYIN',
        default: 'AYIN — Eyewear'
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="he" dir="rtl">
            <head>
                <link rel="icon" href="/ayin-mark.svg" sizes="any" />
            </head>
            <body className="antialiased">{children}</body>
        </html>
    );
}
