import '../styles/globals.css';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { AuthProvider } from '../components/session-provider';

export const metadata = {
    title: {
        template: '%s | Adigo',
        default: 'Adigo - עוזר AI למודעות'
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="he">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="antialiased bg-white">
                <AuthProvider>
                    <div className="flex flex-col min-h-screen">
                        <Header />
                        <main className="grow">{children}</main>
                        <Footer />
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}
