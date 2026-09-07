'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useShop } from './providers';
import { RevealWords } from './reveal';
import { IconArrow } from './icons';

const HERO_FRAMES = [
    { src: '/products/sovereign-rose-1.jpg', tint: '#b76e53' },
    { src: '/products/vesper-taupe-1.jpg', tint: '#6b5a51' },
    { src: '/products/hexa-noir-1.jpg', tint: '#2f6fb5' }
];

export function Hero() {
    const { t } = useShop();
    const ref = useRef(null);
    const [offset, setOffset] = useState(0);
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const onScroll = () => setOffset(window.scrollY);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const id = setInterval(() => setFrame((f) => (f + 1) % HERO_FRAMES.length), 4600);
        return () => clearInterval(id);
    }, []);

    const active = HERO_FRAMES[frame];

    return (
        <section ref={ref} className="relative px-5 pt-10 pb-20 overflow-hidden sm:px-10 sm:pt-16 lg:pb-28">
            <div
                aria-hidden
                className="absolute rounded-full pointer-events-none -top-32 end-[-10%] w-[42rem] h-[42rem] blur-3xl transition-colors duration-1000"
                style={{
                    background: `radial-gradient(circle, ${active.tint}33 0%, transparent 62%)`,
                    transform: `translateY(${offset * 0.14}px)`
                }}
            />

            <div className="relative grid items-center gap-10 mx-auto max-w-[1600px] lg:grid-cols-[1.05fr_1fr]">
                <div className="relative z-10">
                    <p className="mb-6 eyebrow animate-in-up">{t.hero.eyebrow}</p>
                    <h1 className="mb-8">
                        <span className="block overflow-hidden">
                            <RevealWords text={t.hero.title1} delay={80} />
                        </span>
                        <span className="block overflow-hidden text-inksoft">
                            <RevealWords text={t.hero.title2} delay={220} />
                        </span>
                        <span className="block overflow-hidden">
                            <RevealWords text={t.hero.title3} delay={380} />
                        </span>
                    </h1>
                    <p
                        className="max-w-md mb-10 leading-relaxed text-inksoft animate-in-up"
                        style={{ animationDelay: '620ms' }}
                    >
                        {t.hero.body}
                    </p>
                    <div
                        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap animate-in-up"
                        style={{ animationDelay: '760ms' }}
                    >
                        <Link href="/collection" className="btn-ayin">
                            <span>{t.hero.cta}</span>
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                        <Link href="/#categories" className="btn-ayin btn-ghost">
                            <span>{t.hero.ctaCategories}</span>
                        </Link>
                    </div>
                </div>

                <div
                    className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5]"
                    style={{ transform: `translateY(${offset * -0.06}px)` }}
                >
                    <div className="absolute inset-0 overflow-hidden rounded-none bg-bone">
                        {HERO_FRAMES.map((item, index) => (
                            <Image
                                key={item.src}
                                src={item.src}
                                alt=""
                                fill
                                priority={index === 0}
                                sizes="(max-width: 1024px) 92vw, 45vw"
                                className="object-cover transition-all duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                                style={{
                                    opacity: index === frame ? 1 : 0,
                                    transform: index === frame ? 'scale(1)' : 'scale(1.08)'
                                }}
                            />
                        ))}
                    </div>

                    <div className="absolute flex gap-1.5 bottom-5 start-5">
                        {HERO_FRAMES.map((item, index) => (
                            <button
                                key={item.src}
                                type="button"
                                aria-label={`frame ${index + 1}`}
                                onClick={() => setFrame(index)}
                                className={`h-[3px] rounded-full transition-all duration-500 ${
                                    index === frame ? 'w-10 bg-ink' : 'w-4 bg-ink/25'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-14 lg:mt-20">
                <span className="eyebrow">{t.hero.scroll}</span>
                <span className="relative h-10 w-px overflow-hidden bg-line">
                    <span className="absolute inset-0 bg-ink scroll-hint-bar" />
                </span>
            </div>
        </section>
    );
}

export function Marquee() {
    const { t } = useShop();
    const words = [...t.marquee, ...t.marquee];
    return (
        <div className="py-5 overflow-hidden border-y hairline bg-bone marquee-host">
            <div className="marquee-track">
                {words.map((word, index) => (
                    <span
                        key={`${word}-${index}`}
                        className="flex items-center gap-8 px-8 text-[0.72rem] tracking-[0.24em] uppercase whitespace-nowrap text-inksoft"
                    >
                        {word}
                        <span className="w-1 h-1 rounded-full bg-brass" />
                    </span>
                ))}
            </div>
        </div>
    );
}
