import '../styles/globals.css';

export const metadata = {
    title: {
        template: '%s | מאיה בוטיק',
        default: 'מאיה בוטיק — אופנת נשים'
    },
    description: 'בוטיק אופנה עצמאי: שמלות, סריגים וחולצות בסדרות קטנות, בעבודת יד ובבדים טבעיים.'
};

export default function RootLayout({ children }) {
    return (
        <html lang="he" dir="rtl">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="antialiased bg-cream text-espresso">{children}</body>
        </html>
    );
}
