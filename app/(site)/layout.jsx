import { Footer } from '../../components/footer';
import { Header } from '../../components/header';

export default function SiteLayout({ children }) {
    return (
        <div className="flex flex-col min-h-screen px-6 text-white bg-blue-900 bg-noise sm:px-12">
            <div className="flex flex-col w-full max-w-5xl mx-auto grow">
                <Header />
                <main className="grow">{children}</main>
                <Footer />
            </div>
        </div>
    );
}
