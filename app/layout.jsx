import '../styles/globals.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://am-clothing.vercel.app';
const DESCRIPTION =
    'AM CLOTHING — קולקציית פתיחה בסדרה מוגבלת. חולצות ומכנסי פוטר בשחור ולבן, עם רקמת זהב.';

export const metadata = {
    // metadataBase turns every relative image and canonical path below into an absolute URL,
    // which is what crawlers and link previews require.
    metadataBase: new URL(SITE),
    title: {
        template: '%s | AM CLOTHING',
        default: 'AM CLOTHING — חנות בגדים | קולקציית 2026'
    },
    description: DESCRIPTION,
    keywords: ['AM CLOTHING', 'חנות בגדים', 'חולצות', 'מכנסי פוטר', 'סטים', 'קולקציה 2026'],
    alternates: { canonical: '/' },
    openGraph: {
        type: 'website',
        locale: 'he_IL',
        siteName: 'AM CLOTHING',
        title: 'AM CLOTHING — חנות בגדים',
        description: DESCRIPTION,
        url: SITE,
        images: [{ url: '/images/products/brand-logo.jpg', width: 1200, height: 1200, alt: 'AM CLOTHING' }]
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AM CLOTHING — חנות בגדים',
        description: DESCRIPTION,
        images: ['/images/products/brand-logo.jpg']
    },
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 }
    }
};

// Tells Google this is a real shop with a name, logo and contact channel.
const ORG_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'AM CLOTHING',
    description: DESCRIPTION,
    url: SITE,
    logo: `${SITE}/images/products/brand-logo.jpg`,
    image: `${SITE}/images/products/brand-logo.jpg`,
    telephone: '+972-55-972-5632',
    areaServed: 'IL',
    currenciesAccepted: 'ILS',
    contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+972-55-972-5632',
        contactType: 'customer service',
        availableLanguage: ['he']
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="he" dir="rtl">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
                />
            </head>
            <body className="antialiased" style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
                {children}
            </body>
        </html>
    );
}
