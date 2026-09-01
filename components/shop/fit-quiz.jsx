'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { products, FACE_SHAPES } from '../../data/eyewear';
import { useShop } from './providers';
import { ProductCard } from './product-card';
import { QuickView } from './quick-view';
import { Reveal } from './reveal';
import { IconArrow } from './icons';

const LOOK_SHAPES = {
    classic: ['rectangle', 'round'],
    bold: ['square', 'hexagon'],
    soft: ['oval', 'round', 'cat']
};

const PRESENCE_WEIGHT = { low: [0, 25], mid: [25, 29], high: [29, 99] };

function score(product, answers) {
    let value = 0;
    if (answers.face && product.fits.includes(answers.face)) value += 4;
    if (answers.look && LOOK_SHAPES[answers.look].includes(product.shape)) value += 3;
    if (answers.presence) {
        const [min, max] = PRESENCE_WEIGHT[answers.presence];
        if (product.specs.weight >= min && product.specs.weight < max) value += 2;
    }
    value += product.rating / 10;
    return value;
}

function Option({ children, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-6 py-5 text-start border rounded-2xl transition-all duration-300 ${
                active ? 'border-ink bg-bone shadow-sm' : 'hairline hover:border-ink/40 hover:-translate-y-0.5'
            }`}
        >
            <span className="display text-xl">{children}</span>
        </button>
    );
}

export function FitQuiz() {
    const { t, lang } = useShop();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({ face: null, look: null, presence: null });
    const [quick, setQuick] = useState(null);

    const results = useMemo(
        () => [...products].sort((a, b) => score(b, answers) - score(a, answers)).slice(0, 3),
        [answers]
    );

    const steps = [
        {
            key: 'face',
            title: t.fit.q1,
            options: Object.entries(FACE_SHAPES).map(([key, label]) => ({ key, label: label[lang] }))
        },
        {
            key: 'look',
            title: t.fit.q2,
            options: Object.entries(t.fit.looks).map(([key, label]) => ({ key, label }))
        },
        {
            key: 'presence',
            title: t.fit.q3,
            options: Object.entries(t.fit.presence).map(([key, label]) => ({ key, label }))
        }
    ];

    const done = step >= steps.length;
    const current = steps[Math.min(step, steps.length - 1)];

    return (
        <>
            <section className="px-5 py-16 sm:px-10 sm:py-24">
                <div className="mx-auto max-w-3xl">
                    <p className="mb-4 text-center eyebrow">AYIN Fit</p>
                    <h1 className="mb-12 text-center text-[clamp(2.2rem,6vw,4rem)]">{t.sections.fit}</h1>

                    <div className="flex gap-2 mb-12">
                        {steps.map((item, index) => (
                            <span
                                key={item.key}
                                className="h-[3px] flex-1 rounded-full overflow-hidden bg-line"
                            >
                                <span
                                    className="block h-full transition-all duration-700 ease-out rounded-full bg-ink"
                                    style={{ width: index < step ? '100%' : index === step ? '45%' : '0%' }}
                                />
                            </span>
                        ))}
                    </div>

                    {!done ? (
                        <div key={current.key} className="animate-in-up">
                            <h2 className="mb-8">{current.title}</h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {current.options.map((option) => (
                                    <Option
                                        key={option.key}
                                        active={answers[current.key] === option.key}
                                        onClick={() => {
                                            setAnswers((prev) => ({ ...prev, [current.key]: option.key }));
                                            setTimeout(() => setStep((s) => s + 1), 220);
                                        }}
                                    >
                                        {option.label}
                                    </Option>
                                ))}
                            </div>

                            {step === 0 && (
                                <div className="p-6 mt-10 rounded-2xl bg-bone">
                                    <p className="mb-2 eyebrow">{t.fit.unsure}</p>
                                    <p className="text-sm leading-relaxed text-inksoft">{t.fit.unsureBody}</p>
                                </div>
                            )}

                            {step > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                                    className="mt-8 text-sm underline text-inksoft underline-offset-4"
                                >
                                    ← {t.fit.back}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in-up">
                            <h2 className="mb-3 text-center">{t.fit.result}</h2>
                            <p className="mb-12 text-sm text-center text-inksoft">
                                {FACE_SHAPES[answers.face]?.[lang]} · {t.fit.looks[answers.look]} ·{' '}
                                {t.fit.presence[answers.presence]}
                            </p>
                            <div className="grid gap-6 sm:grid-cols-3">
                                {results.map((product, index) => (
                                    <Reveal key={product.slug} delay={index * 120}>
                                        <ProductCard product={product} onQuickView={setQuick} />
                                    </Reveal>
                                ))}
                            </div>
                            <div className="flex flex-wrap justify-center gap-3 mt-12">
                                <Link href="/collection" className="btn-ayin">
                                    <span>{t.sections.all}</span>
                                    <IconArrow className="w-4 h-4 rtl:rotate-180" />
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(0);
                                        setAnswers({ face: null, look: null, presence: null });
                                    }}
                                    className="btn-ayin btn-ghost"
                                >
                                    <span>{t.fit.again}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
            <QuickView product={quick} onClose={() => setQuick(null)} />
        </>
    );
}
