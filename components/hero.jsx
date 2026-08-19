import Link from 'next/link';
import { Counter } from 'components/counter';
import { Reveal } from 'components/reveal';

const stats = [
    { to: 12, suffix: 'K+', label: 'מתאמנים פעילים' },
    { to: 4.9, decimals: 1, label: 'דירוג ממוצע' },
    { to: 45, suffix: '+', label: 'תוכניות אימון' },
    { to: 0, label: 'ציוד חובה' }
];

export function Hero() {
    return (
        <section id="top" className="relative pt-10 pb-20 overflow-hidden sm:pt-16 sm:pb-28">
            <div
                className="blob w-[26rem] h-[26rem] -top-24 -right-24 bg-primary/30"
                style={{ animationDelay: '0s' }}
                aria-hidden="true"
            />
            <div
                className="blob w-[22rem] h-[22rem] top-40 -left-32 bg-secondary/25"
                style={{ animationDelay: '3s' }}
                aria-hidden="true"
            />

            <div className="relative grid items-center gap-12 lg:grid-cols-2">
                <div>
                    <Reveal>
                        <span className="badge">
                            <span className="relative flex w-2 h-2">
                                <span className="absolute inline-flex w-full h-full rounded-full opacity-75 bg-primary pulse-ring" />
                                <span className="relative inline-flex w-2 h-2 rounded-full bg-primary" />
                            </span>
                            אימון ניסיון חינם לשבוע הקרוב
                        </span>
                    </Reveal>

                    <Reveal delay={80}>
                        <h1 className="mt-6 font-display text-6xl leading-[0.95] tracking-wide sm:text-7xl">
                            תתחילו לבעור.
                            <br />
                            <span className="text-gradient">מהסלון שלכם.</span>
                        </h1>
                    </Reveal>

                    <Reveal delay={160}>
                        <p className="max-w-lg mt-6 text-lg text-neutral-300">
                            תוכניות אימון אישיות בעצימות גבוהה, ליווי מאמן אמיתי ומעקב התקדמות חכם. בלי מנוי לחדר כושר,
                            בלי תירוצים — רק 20–45 דקות ביום.
                        </p>
                    </Reveal>

                    <Reveal delay={240}>
                        <div className="flex flex-wrap gap-4 mt-8">
                            <Link href="#pricing" className="btn btn-lg glow-primary">
                                התחילו אימון ניסיון חינם
                            </Link>
                            <Link href="#programs" className="btn-lg btn-outline">
                                צפו בתוכניות האימון
                            </Link>
                        </div>
                    </Reveal>

                    <Reveal delay={320}>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-6 pt-10 mt-10 border-t sm:grid-cols-4 border-edge">
                            {stats.map((stat) => (
                                <div key={stat.label} className="min-w-0">
                                    <dt className="sr-only">{stat.label}</dt>
                                    <dd className="font-display text-2xl text-white truncate sm:text-3xl">
                                        <Counter to={stat.to} suffix={stat.suffix} decimals={stat.decimals} />
                                    </dd>
                                    <dd className="mt-1 text-sm text-muted">{stat.label}</dd>
                                </div>
                            ))}
                        </dl>
                    </Reveal>
                </div>

                <Reveal delay={200} className="relative">
                    <div className="relative p-2 border card-surface rounded-3xl glow-primary">
                        <div className="relative flex items-center justify-center overflow-hidden aspect-square rounded-[1.4rem] bg-gradient-to-br from-surface-2 to-neutral-950">
                            <svg viewBox="0 0 200 200" className="w-2/3 h-2/3 opacity-90" aria-hidden="true">
                                <circle cx="100" cy="100" r="88" fill="none" stroke="var(--color-edge)" strokeWidth="10" />
                                <circle
                                    cx="100"
                                    cy="100"
                                    r="88"
                                    fill="none"
                                    stroke="var(--color-primary)"
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    strokeDasharray="553"
                                    strokeDashoffset="120"
                                    transform="rotate(-90 100 100)"
                                />
                                <path
                                    d="M108 38 70 108h34l-8 54 56-78h-38l6-46Z"
                                    fill="var(--color-primary)"
                                    stroke="var(--color-secondary)"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <div className="absolute p-4 border shadow-xl -bottom-6 -right-4 sm:-right-8 card-surface rounded-2xl float-y shadow-black/40">
                            <p className="text-xs text-muted">קלוריות היום</p>
                            <p className="font-display text-2xl text-primary">412 קק״ל</p>
                        </div>

                        <div
                            className="absolute p-4 border shadow-xl -top-6 -left-4 sm:-left-8 card-surface rounded-2xl float-y shadow-black/40"
                            style={{ animationDelay: '1.4s' }}
                        >
                            <p className="text-xs text-muted">רצף אימונים</p>
                            <p className="font-display text-2xl text-secondary">🔥 18 ימים</p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
