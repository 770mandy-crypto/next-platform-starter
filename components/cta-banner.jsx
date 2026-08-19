import Link from 'next/link';
import { Reveal } from 'components/reveal';

export function CtaBanner() {
    return (
        <section className="py-20 sm:py-28">
            <Reveal>
                <div className="relative overflow-hidden text-center border card-surface rounded-3xl border-edge px-6 py-16 sm:px-16 sm:py-20">
                    <div className="blob w-96 h-96 -top-32 left-1/2 -translate-x-1/2 bg-primary/20" aria-hidden="true" />
                    <div className="blob w-72 h-72 bottom-0 right-0 bg-secondary/25" aria-hidden="true" style={{ animationDelay: '2s' }} />

                    <div className="relative">
                        <h2 className="font-display text-5xl tracking-wide sm:text-6xl">
                            מוכנים <span className="text-gradient">להצית</span> את השינוי?
                        </h2>
                        <p className="max-w-xl mx-auto mt-5 text-lg text-neutral-300">
                            הצטרפו לאלפי מתאמנים שכבר בונים גוף וביטחון מהבית. 7 ימי ניסיון חינם, בלי כרטיס אשראי.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 mt-8">
                            <Link href="#pricing" className="btn btn-lg glow-primary">
                                התחילו אימון ניסיון חינם
                            </Link>
                        </div>
                    </div>
                </div>
            </Reveal>
        </section>
    );
}
