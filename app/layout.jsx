import '../styles/globals.css';
import { Footer } from '../components/footer';
import { Header } from '../components/header';

export const metadata = {
    title: {
        template: '%s | IGNITE',
        default: 'IGNITE — כושר ביתי בעצימות גבוהה'
    },
    description:
        'תוכניות אימון אישיות בעצימות גבוהה מהבית, עם ליווי מאמן אמיתי ומעקב התקדמות חכם. בלי מנוי לחדר כושר, בלי תירוצים.'
};

export default function RootLayout({ children }) {
    return (
        <html lang="he" dir="rtl">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="antialiased text-white bg-neutral-950">
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
