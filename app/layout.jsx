import '../styles/globals.css';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { AuthProvider } from '../components/auth-provider';

export const metadata = {
    title: {
        template: '%s | FixNow',
        default: 'FixNow - חיבור קל בין לקוחות לבעלי מקצוע'
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="he">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="antialiased text-white bg-blue-900">
                <AuthProvider>
                    <div className="flex flex-col min-h-screen px-6 bg-noise sm:px-12">
                        <div className="flex flex-col w-full max-w-5xl mx-auto grow">
                            <Header />
                            <main className="grow">{children}</main>
                            <Footer />
                        </div>
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}
