import '../styles/globals.css';
import { AuthProvider } from '../components/session-provider';

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
            </head>
            <body className="antialiased bg-white">
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
