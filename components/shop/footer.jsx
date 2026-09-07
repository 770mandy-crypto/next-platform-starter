'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CATEGORIES } from '../../data/catalogue';
import { useShop } from './providers';
import { IconArrow } from './icons';
import { Reveal } from './reveal';

export function Newsletter() {
    const { t } = useShop();
    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState('');

    return (
        <section className="relative px-5 py-24 overflow-hidden border-y text-ink bg-bone hairline sm:px-10 sm:py-32">
            <div
                aria-hidden
                className="absolute -top-40 start-1/2 w-[46rem] h-[46rem] -translate-x-1/2 rounded-full opacity-[0.13] blur-3xl"
                style={{ background: 'radial-gradient(circle, #a9793e 0%, transparent 65%)' }}
            />
            <Reveal className="relative max-w-2xl mx-auto text-center">
                <p className="mb-5 eyebrow">AYIN</p>
                <h2 className="mb-5">{t.sections.newsletter}</h2>
                <p className="mb-10 leading-relaxed text-inksoft">{t.newsletter.body}</p>

                {sent ? (
                    <p className="text-brass display text-xl">{t.newsletter.thanks}</p>
                ) : (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (email.includes('@')) setSent(true);
                        }}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:max-w-lg sm:mx-auto"
                    >
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder={t.newsletter.placeholder}
                            className="flex-1 px-6 py-4 text-sm bg-transparent border rounded-none hairline focus:outline-none focus:border-brass placeholder:text-inksoft/70"
                        />
                        <button type="submit" className="btn-ayin">
                            <span>{t.newsletter.submit}</span>
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </button>
                    </form>
                )}
            </Reveal>
        </section>
    );
}

export function SiteFooter() {
    const { t, lang } = useShop();

    const columns = [
        {
            title: t.footer.shop,
            links: [
                { label: t.nav.collection, href: '/collection' },
                { label: t.nav.search, href: '/search' },
                { label: t.nav.wishlist, href: '/wishlist' },
                { label: t.nav.fit, href: '/fit' },
                { label: t.cart.title, href: '/checkout' }
            ]
        },
        {
            title: t.sections.categories,
            links: Object.entries(CATEGORIES).map(([key, entry]) => ({
                label: entry.name[lang],
                href: `/category/${key}`
            }))
        },
        {
            title: t.footer.about,
            links: [
                { label: t.nav.story, href: '/story' },
                { label: t.footer.care, href: '/service' }
            ]
        },
        {
            title: t.footer.help,
            links: [
                { label: t.footer.faq, href: '/service' },
                { label: t.footer.returns, href: '/service' },
                { label: t.footer.contact, href: '/service' }
            ]
        }
    ];

    return (
        <footer className="px-5 pt-20 pb-10 border-t bg-bone hairline sm:px-10">
            <div className="grid gap-12 mx-auto max-w-[1600px] md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
                <div>
                    <p className="display text-[2rem] tracking-[0.32em] mb-4">AYIN</p>
                    <p className="max-w-xs text-sm leading-relaxed text-inksoft">{t.brandTagline}</p>
                </div>
                {columns.map((column) => (
                    <div key={column.title}>
                        <p className="mb-5 eyebrow">{column.title}</p>
                        <ul className="space-y-3">
                            {column.links.map((link) => (
                                <li key={`${column.title}-${link.label}`}>
                                    <Link href={link.href} className="text-sm link-line text-inksoft hover:text-ink">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-2 pt-8 mt-16 text-xs border-t sm:flex-row sm:justify-between hairline text-inksoft mx-auto max-w-[1600px]">
                <p>© {new Date().getFullYear()} AYIN. {t.footer.rights}.</p>
                <p>{t.footer.demo}</p>
            </div>
        </footer>
    );
}
