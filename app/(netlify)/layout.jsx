import { Footer } from '../../components/footer';
import { Header } from '../../components/header';

export const metadata = {
    title: {
        template: '%s | Netlify',
        default: 'Netlify Starter'
    }
};

// The Netlify platform demos are kept as-is, in English and left-to-right,
// separate from the Hebrew boutique that lives at the site root.
export default function NetlifyDemoLayout({ children }) {
    return (
        <div dir="ltr" className="flex flex-col min-h-screen px-6 text-white bg-blue-900 bg-noise sm:px-12">
            <div className="flex flex-col w-full max-w-5xl mx-auto grow">
                <Header />
                <main className="grow">{children}</main>
                <Footer />
            </div>
        </div>
    );
}
