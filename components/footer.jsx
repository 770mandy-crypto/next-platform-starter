import Link from 'next/link';
import { Logo } from 'components/logo';

const columns = [
    {
        title: 'מוצר',
        links: [
            { text: 'תוכניות אימון', href: '#programs' },
            { text: 'איך זה עובד', href: '#how' },
            { text: 'מחירים', href: '#pricing' }
        ]
    },
    {
        title: 'חברה',
        links: [
            { text: 'המלצות', href: '#testimonials' },
            { text: 'שאלות נפוצות', href: '#faq' },
            { text: 'צור קשר', href: 'mailto:hello@ignite.fit' }
        ]
    },
    {
        title: 'משפטי',
        links: [
            { text: 'תנאי שימוש', href: '#' },
            { text: 'מדיניות פרטיות', href: '#' }
        ]
    }
];

export function Footer() {
    return (
        <footer className="pt-16 pb-10 mt-24 border-t sm:pt-20 border-edge">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-1">
                    <Logo className="text-white" />
                    <p className="max-w-xs mt-4 text-sm text-muted">
                        כושר ביתי ברמה של סטודיו. תוכניות אימון בעצימות גבוהה, ליווי אמיתי ותוצאות שרואים.
                    </p>
                </div>

                {columns.map((col) => (
                    <div key={col.title}>
                        <h3 className="mb-4 text-sm font-bold tracking-wide text-white uppercase">{col.title}</h3>
                        <ul className="flex flex-col gap-2.5">
                            {col.links.map((link) => (
                                <li key={link.text}>
                                    <Link href={link.href} className="text-sm no-underline text-muted hover:text-white">
                                        {link.text}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="flex flex-col items-center justify-between gap-4 pt-8 mt-12 text-sm border-t border-edge text-muted sm:flex-row">
                <p>© {new Date().getFullYear()} IGNITE. כל הזכויות שמורות.</p>
                <p>נבנה עם 🔥 בישראל</p>
            </div>
        </footer>
    );
}
