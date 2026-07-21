import Link from 'next/link';
import { Card } from 'components/card';
import { ContextAlert } from 'components/context-alert';
import { Markdown } from 'components/markdown';
import { RandomQuote } from 'components/random-quote';
import { getNetlifyContext } from 'utils';

const contextExplainer = `
The card below is rendered on the server based on the value of \`process.env.CONTEXT\` 
([docs](https://docs.netlify.com/configure-builds/environment-variables/#build-metadata)):
`;

const preDynamicContentExplainer = `
The card content below is fetched by the client-side from \`/quotes/random\` (see file \`app/quotes/random/route.js\`) with a different quote shown on each page load:
`;

const ctx = getNetlifyContext();

export default function Page() {
    return (
        <div className="flex flex-col gap-12 sm:gap-16">
            <Link
                href="/coach"
                dir="rtl"
                className="block p-6 no-underline transition border rounded-lg border-primary/40 bg-primary/10 hover:bg-primary/20"
            >
                <div className="flex items-center gap-4">
                    <span className="text-4xl">🏋️</span>
                    <div className="text-right">
                        <div className="text-lg font-bold text-primary">מאמן כושר AI — חדש!</div>
                        <div className="text-sm text-white/80">
                            צ׳אט מאמן חכם שבונה לכם תוכנית אימון אישית עם הדגמות וידאו. לחצו כדי להתחיל ←
                        </div>
                    </div>
                </div>
            </Link>
            <section>
                <ContextAlert className="mb-6" />
                <h1 className="mb-4">Netlify Platform Starter – Next.js</h1>
                <p className="mb-6 text-lg">
                    Deploy the latest version of Next.js — including Turbopack, React Compiler, and the new caching APIs
                    — on Netlify in seconds. No configuration or custom adapter required.
                </p>
                <Link href="https://docs.netlify.com/frameworks/next-js/overview/" className="btn btn-lg sm:min-w-64">
                    Read the Docs
                </Link>
            </section>
            {!!ctx && (
                <section className="flex flex-col gap-4">
                    <Markdown content={contextExplainer} />
                    <RuntimeContextCard />
                </section>
            )}
            <section className="flex flex-col gap-4">
                <Markdown content={preDynamicContentExplainer} />
                <RandomQuote />
            </section>
        </div>
    );
}

function RuntimeContextCard() {
    const title = `Netlify Context: running in ${ctx} mode.`;
    if (ctx === 'dev') {
        return (
            <Card title={title}>
                <p>Next.js will rebuild any page you navigate to, including static pages.</p>
            </Card>
        );
    } else {
        const now = new Date().toISOString();
        return (
            <Card title={title}>
                <p>This page was statically-generated at build time ({now}).</p>
            </Card>
        );
    }
}
