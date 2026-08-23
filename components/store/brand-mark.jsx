/*
The AM CLOTHING lockup, rebuilt from the brand artwork as live type rather than a
bitmap: an AM monogram whose M tucks under the A's right stroke, a
rule–CLOTHING–rule line, and the year.

Built in HTML rather than SVG so the Cormorant Garamond webfont actually applies
and the gold reads as leaf via a clipped gradient.

`dir="ltr"` is essential — the page is right-to-left, and without it the browser
reorders the monogram to MA and mirrors the overlap.

Variants: `full` (default), `compact` (monogram + CLOTHING, for the header) and
`monogram`.
*/

export function BrandMark({ scale = 1, shimmer = false, className = '', variant = 'full' }) {
    const size = (value) => `${value * scale}rem`;
    const showLabel = variant !== 'monogram';
    const showFull = variant === 'full';

    const label = (
        <span
            className="gold-leaf"
            style={{
                fontFamily: 'var(--font-body)',
                fontSize: size(0.5),
                letterSpacing: '0.34em',
                fontWeight: 600
            }}
        >
            CLOTHING
        </span>
    );

    return (
        <span
            dir="ltr"
            className={`inline-flex flex-col items-center leading-none select-none ${className}`}
            style={{ fontFamily: 'var(--font-display)' }}
        >
            <span
                className={`relative inline-block ${shimmer ? 'shimmer' : ''}`}
                style={{ fontSize: size(3.4), lineHeight: 0.95 }}
                aria-hidden="true"
            >
                <span className="gold-leaf font-medium">A</span>
                <span
                    className="gold-leaf font-medium"
                    style={{ marginLeft: '-0.2em', display: 'inline-block' }}
                >
                    M
                </span>
            </span>

            {showLabel && !showFull && (
                <span style={{ marginTop: size(0.42) }} aria-hidden="true">
                    {label}
                </span>
            )}

            {showFull && (
                <>
                    <span
                        className="flex items-center"
                        style={{ gap: size(0.4), marginTop: size(0.45) }}
                        aria-hidden="true"
                    >
                        <i className="block h-px" style={{ width: size(1.1), background: 'var(--color-gold)' }} />
                        {label}
                        <i className="block h-px" style={{ width: size(1.1), background: 'var(--color-gold)' }} />
                    </span>

                    <span
                        className="flex items-center"
                        style={{ gap: size(0.4), marginTop: size(0.3) }}
                        aria-hidden="true"
                    >
                        <i className="block h-px" style={{ width: size(0.6), background: 'var(--color-gold)' }} />
                        <span
                            className="gold-leaf"
                            style={{ fontSize: size(0.62), letterSpacing: '0.26em' }}
                        >
                            2026
                        </span>
                        <i className="block h-px" style={{ width: size(0.6), background: 'var(--color-gold)' }} />
                    </span>
                </>
            )}

            <span className="sr-only">AM Clothing 2026</span>
        </span>
    );
}
