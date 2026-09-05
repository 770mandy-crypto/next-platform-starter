import { headers } from 'next/headers';
import '../styles/globals.css';
import { Footer } from '../components/footer';
import { Header } from '../components/header';

export const metadata = {
    title: {
        template: '%s | Netlify',
        default: 'Netlify Starter'
    }
};

export default async function RootLayout({ children }) {
    // The AM Clothing store (/store/*) is a Hebrew/RTL app with its own header,
    // footer and theme, so it opts out of this starter's English/LTR chrome
    // instead of nesting inside it. The pathname arrives via a header set in
    // middleware.js, since a root layout otherwise has no way to see the route.
    const pathname = (await headers()).get('x-pathname') || '';
    const isStore = pathname.startsWith('/store');

    if (isStore) {
        return (
            <html lang="he" dir="rtl">
                <head>
                    <link rel="icon" href="/favicon.svg" sizes="any" />
                </head>
                <body>{children}</body>
            </html>
        );
    }

    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="antialiased text-white bg-blue-900">
                <div className="flex flex-col min-h-screen px-6 bg-noise sm:px-12">
                    <div className="flex flex-col w-full max-w-5xl mx-auto grow">
                        <Header />
                        <main className="grow">{children}</main>
                        <Footer />
                    </div>
                </div>
            </body>
        </html>
    );
}
