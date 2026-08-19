import { Counter } from 'components/counter';
import { Reveal } from 'components/reveal';

const results = [
    { to: 87, suffix: '%', label: 'רואים שיפור מדיד תוך 30 יום' },
    { to: 3.2, decimals: 1, suffix: 'M', label: 'אימונים הושלמו עד היום' },
    { to: 4.9, decimals: 1, label: 'דירוג ממוצע מהמתאמנים' },
    { to: 96, suffix: '%', label: 'ממליצים לחבר על AVID' }
];

export function Results() {
    return (
        <section id="results" className="py-20 sm:py-28">
            <Reveal>
                <div className="relative p-8 overflow-hidden border card-surface rounded-3xl border-edge sm:p-14">
                    <div className="blob w-72 h-72 -bottom-24 -left-24 bg-secondary/20" aria-hidden="true" />
                    <div className="blob w-72 h-72 -top-24 -right-24 bg-primary/20" aria-hidden="true" />

                    <div className="relative max-w-xl">
                        <span className="badge">תוצאות אמיתיות</span>
                        <h2 className="mt-4">המספרים מדברים בעד עצמם</h2>
                    </div>

                    <dl className="relative grid grid-cols-2 gap-8 mt-12 lg:grid-cols-4">
                        {results.map((item) => (
                            <div key={item.label}>
                                <dd className="font-display text-4xl text-gradient sm:text-5xl">
                                    <Counter to={item.to} suffix={item.suffix} decimals={item.decimals} />
                                </dd>
                                <dt className="mt-2 text-sm text-neutral-300">{item.label}</dt>
                            </div>
                        ))}
                    </dl>
                </div>
            </Reveal>
        </section>
    );
}
