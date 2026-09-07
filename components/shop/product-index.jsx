'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { CATEGORIES } from '../../data/catalogue';
import { useShop } from './providers';

/**
 * The catalogue as a numbered list rather than a wall of cards.
 *
 * Hovering a row lifts the product's photograph next to the cursor, so the
 * whole shop can be read as text and still be seen. Touch devices never fire
 * the hover, so every row is a plain link and loses nothing.
 */
export function ProductIndex({ items, startAt = 1 }) {
    const { lang, price } = useShop();
    const [active, setActive] = useState(null);
    const [point, setPoint] = useState({ x: 0, y: 0 });
    const host = useRef(null);

    const onMove = (event) => {
        const rect = host.current?.getBoundingClientRect();
        if (!rect) return;
        setPoint({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    };

    return (
        <div ref={host} className="relative" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
            <ul className="border-t hairline">
                {items.map((product, index) => (
                    <li key={product.slug} className="border-b hairline">
                        <Link
                            href={`/product/${product.slug}`}
                            onMouseEnter={() => setActive(product)}
                            onFocus={() => setActive(product)}
                            onBlur={() => setActive(null)}
                            className="grid items-center grid-cols-[2.5rem_1fr_auto] gap-4 py-5 sm:py-7 sm:gap-8 sm:grid-cols-[3.5rem_1fr_10rem_auto] group"
                        >
                            <span className="text-xs ticker-digit text-inksoft">
                                {String(index + startAt).padStart(2, '0')}
                            </span>

                            <span className="min-w-0">
                                <span className="block text-[clamp(1.4rem,3.4vw,2.6rem)] font-black tracking-[-0.04em] leading-none transition-transform duration-500 ease-out group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                                    {product.name[lang]}
                                </span>
                                <span className="block mt-2 text-xs sm:hidden text-inksoft">
                                    {CATEGORIES[product.category].name[lang]}
                                </span>
                            </span>

                            <span className="hidden text-xs sm:block text-inksoft">
                                {CATEGORIES[product.category].name[lang]}
                            </span>

                            <span className="text-sm ticker-digit whitespace-nowrap">{price(product.price)}</span>
                        </Link>
                    </li>
                ))}
            </ul>

            {/* The floating preview follows the pointer; it is decoration for
                sighted mouse users, so it stays out of the accessibility tree.
                It is placed with physical left/top because the offsets are
                measured from the container's left edge, which does not flip
                with writing direction. */}
            <div
                aria-hidden
                className="absolute top-0 left-0 hidden w-56 transition-opacity duration-300 pointer-events-none lg:block aspect-[4/5]"
                style={{
                    transform: `translate3d(${point.x - 112}px, ${point.y - 280}px, 0)`,
                    opacity: active ? 1 : 0
                }}
            >
                {active && (
                    <Image
                        key={active.slug}
                        src={active.variants[0].image}
                        alt=""
                        fill
                        sizes="224px"
                        className="object-cover bg-plate"
                    />
                )}
            </div>
        </div>
    );
}
