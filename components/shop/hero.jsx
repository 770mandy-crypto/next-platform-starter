'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useShop } from './providers';
import { IconArrow } from './icons';

const HERO_FRAMES = [
    { src: '/products/sovereign-rose-1.jpg', slug: 'sovereign' },
    { src: '/products/vesper-taupe-1.jpg', slug: 'vesper' },
    { src: '/products/hexa-noir-1.jpg', slug: 'hexa-noir' }
];

/**
 * A full-bleed opening plate. The type sits on the photograph rather than
 * beside it, so the first screen is one image and one sentence.
 */
export function Hero() {
    const { t } = useShop();
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setFrame((f) => (f + 1) % HERO_FRAMES.length), 5200);
        return () => clearInterval(id);
    }, []);

    return (
        <section className="relative overflow-hidden bg-plate h-[78vh] min-h-[520px] lg:h-[88vh]">
            {HERO_FRAMES.map((item, index) => (
                <Image
                    key={item.src}
                    src={item.src}
                    alt=""
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover transition-[opacity,transform] duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ opacity: index === frame ? 1 : 0, transform: index === frame ? 'scale(1)' : 'scale(1.06)' }}
                />
            ))}

            <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgb(16 16 17 / 0.82) 0%, rgb(16 16 17 / 0.25) 45%, transparent 78%)' }}
            />

            <div className="absolute inset-x-0 bottom-0 px-5 pb-10 sm:px-10 sm:pb-14">
                <div className="mx-auto max-w-[1600px]">
                    <p className="mb-5 text-[0.62rem] tracking-[0.22em] uppercase text-white/70">{t.hero.eyebrow}</p>
                    <h1 className="max-w-[16ch] text-white">
                        {t.hero.title1} {t.hero.title2} {t.hero.title3}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-8">
                        <Link href="/collection" className="btn-ayin">
                            <span>{t.hero.cta}</span>
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                        <Link
                            href="/#index"
                            className="btn-ayin btn-ghost text-white border-white/70 hover:border-white"
                        >
                            <span>{t.hero.ctaCategories}</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="absolute flex gap-2 bottom-5 end-5 sm:end-10">
                {HERO_FRAMES.map((item, index) => (
                    <button
                        key={item.src}
                        type="button"
                        aria-label={item.slug}
                        onClick={() => setFrame(index)}
                        className={`h-[3px] transition-all duration-500 ${
                            index === frame ? 'w-10 bg-white' : 'w-4 bg-white/40'
                        }`}
                    />
                ))}
            </div>
        </section>
    );
}

export function Marquee() {
    const { t } = useShop();
    const words = [...t.marquee, ...t.marquee];
    return (
        <div className="py-4 overflow-hidden border-b bg-ink text-paper marquee-host">
            <div className="marquee-track">
                {words.map((word, index) => (
                    <span
                        key={`${word}-${index}`}
                        className="flex items-center gap-8 px-8 text-[0.7rem] tracking-[0.24em] uppercase whitespace-nowrap"
                    >
                        {word}
                        <span className="w-1 h-1 bg-brass" />
                    </span>
                ))}
            </div>
        </div>
    );
}
