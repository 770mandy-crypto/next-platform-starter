'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useShop } from './providers';
import { Reveal } from './reveal';
import { Newsletter } from './footer';
import { Marquee } from './hero';

const GALLERY = [
    '/products/sage-olive-1.jpg',
    '/products/aras-noir-1.jpg',
    '/products/hexa-tortoise-1.jpg',
    '/products/marlow-black-1.jpg'
];

// Only figures the storefront itself can prove: they are counted from the
// catalogue and from the shop's own policies.
const NUMBERS = [
    { value: '10', label: { he: 'דגמים', en: 'models' } },
    { value: '16', label: { he: 'גוונים', en: 'colourways' } },
    { value: '30', label: { he: 'יום להחזרה', en: 'day returns' } },
    { value: '2–4', label: { he: 'ימי משלוח', en: 'day delivery' } }
];

export function StoryView() {
    const { t, lang } = useShop();

    return (
        <>
            <section className="px-5 pt-16 pb-12 sm:px-10 sm:pt-24">
                <div className="mx-auto max-w-[1600px]">
                    <p className="mb-5 eyebrow animate-in-up">{t.sections.story}</p>
                    <h1 className="max-w-4xl mb-8">{t.story.title}</h1>
                    <p className="max-w-xl text-lg leading-relaxed text-inksoft">{t.story.lead}</p>
                </div>
            </section>

            <section className="px-5 pb-16 sm:px-10">
                <Reveal mask className="relative mx-auto max-w-[1600px] aspect-[16/9] overflow-hidden rounded-3xl">
                    <Image
                        src="/products/hexa-olive-1.jpg"
                        alt=""
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover"
                    />
                </Reveal>
            </section>

            <Marquee />

            <section className="px-5 py-20 sm:px-10 sm:py-28">
                <div className="mx-auto max-w-[1600px] space-y-16">
                    {t.story.steps.map((step, index) => (
                        <Reveal
                            key={step.n}
                            className={`grid gap-8 lg:grid-cols-2 lg:gap-16 items-center ${
                                index % 2 ? 'lg:[direction:rtl]' : ''
                            }`}
                        >
                            <div className={index % 2 ? 'lg:[direction:ltr]' : ''}>
                                <p className="mb-4 text-sm tracking-[0.3em] text-brass">{step.n}</p>
                                <h2 className="mb-5">{step.t}</h2>
                                <p className="max-w-md leading-relaxed text-inksoft">{step.b}</p>
                            </div>
                            <div className="relative overflow-hidden aspect-[4/3] rounded-3xl bg-bone">
                                <Image
                                    src={GALLERY[index % GALLERY.length]}
                                    alt=""
                                    fill
                                    sizes="(max-width: 1024px) 92vw, 45vw"
                                    className="object-cover transition-transform duration-[1400ms] hover:scale-105"
                                />
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            <section className="px-5 py-20 sm:px-10 bg-ink text-bone">
                <div className="grid gap-10 mx-auto max-w-[1600px] sm:grid-cols-2 lg:grid-cols-4">
                    {NUMBERS.map((item, index) => (
                        <Reveal key={item.value} delay={index * 100} className="text-center">
                            <p className="display text-[clamp(3rem,7vw,5rem)] leading-none mb-3 ticker-digit">
                                {item.value}
                            </p>
                            <p className="text-xs tracking-[0.2em] uppercase text-bone/60">{item.label[lang]}</p>
                        </Reveal>
                    ))}
                </div>
            </section>

            <section className="px-5 py-24 text-center sm:px-10">
                <Reveal>
                    <h2 className="max-w-2xl mx-auto mb-8">{t.brandTagline}</h2>
                    <Link href="/collection" className="btn-ayin">
                        <span>{t.hero.cta}</span>
                    </Link>
                </Reveal>
            </section>

            <Newsletter />
        </>
    );
}
