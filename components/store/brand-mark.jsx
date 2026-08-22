/*
The VALENTOS lockup, rebuilt from the brand artwork as live type rather than a
bitmap: a VS monogram with the S overlapping the V's right stroke, the wordmark,
a rule–CLOTHING–rule line, and the year.

Built in HTML rather than SVG so the Cormorant Garamond webfont actually applies
and the gold reads as leaf via a clipped gradient.

`dir="ltr"` is essential — the page is right-to-left, and without it the browser
reorders the monogram to SV and mirrors the overlap.

Variants: `full` (default), `compact` (monogram + wordmark, for the header) and
`monogram`.
*/

export function BrandMark({ scale = 1, shimmer = false, className = '', variant = 'full' }) {
    const size = (value) => `${value * scale}rem`;
    const showWordmark = variant !== 'monogram';
    const showFooter = variant === 'full';

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
                <span className="gold-leaf font-medium">V</span>
                <span
                    className="gold-leaf font-medium italic"
                    style={{ marginLeft: '-0.36em', display: 'inline-block' }}
                >
                    S
                </span>
            </span>

            {showWordmark && (
                <span
                    className="gold-leaf font-medium"
                    style={{ fontSize: size(1.65), letterSpacing: '0.12em', marginTop: size(0.35) }}
                    aria-hidden="true"
                >
                    VALENTOS
                </span>
            )}

            {showFooter && (
                <>
                    <span
                        className="flex items-center"
                        style={{ gap: size(0.4), marginTop: size(0.3) }}
                        aria-hidden="true"
                    >
                        <i className="block h-px" style={{ width: size(1.1), background: 'var(--color-gold)' }} />
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
                        <i className="block h-px" style={{ width: size(1.1), background: 'var(--color-gold)' }} />
                    </span>

                    <span
                        className="gold-leaf"
                        style={{ fontSize: size(0.62), letterSpacing: '0.26em', marginTop: size(0.28) }}
                        aria-hidden="true"
                    >
                        2026
                    </span>
                </>
            )}

            <span className="sr-only">VALENTOS Clothing 2026</span>
        </span>
    );
}
