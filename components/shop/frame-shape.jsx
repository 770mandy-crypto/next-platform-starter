/**
 * A frame drawn to the product's own measurements.
 *
 * The catalogue carries real lens width, bridge and temple lengths in
 * millimetres, so the try-on overlay can be built from those numbers instead of
 * compositing a three-quarter studio photograph onto a face, which never lines
 * up. Everything below is in millimetre space; the caller scales it.
 */
function lensPath(shape, w, h) {
    const rx = w / 2;
    const ry = h / 2;

    switch (shape) {
        case 'round':
            return `M ${-rx} 0 a ${rx} ${ry} 0 1 0 ${w} 0 a ${rx} ${ry} 0 1 0 ${-w} 0 Z`;
        case 'oval':
            return `M ${-rx} 0 a ${rx} ${ry * 0.92} 0 1 0 ${w} 0 a ${rx} ${ry * 0.92} 0 1 0 ${-w} 0 Z`;
        case 'hexagon': {
            // Flat top and bottom, points at the temple and bridge sides.
            const x = rx;
            const y = ry;
            return `M ${-x} 0 L ${-x * 0.52} ${-y} L ${x * 0.52} ${-y} L ${x} 0 L ${x * 0.52} ${y} L ${-x * 0.52} ${y} Z`;
        }
        case 'cat': {
            // Drawn for the right lens with the outer top corner swept up; the
            // left lens renders this same path mirrored.
            const x = rx;
            const y = ry;
            return [
                `M ${-x * 0.88} ${y * 0.42}`,
                `Q ${-x * 0.1} ${y * 1.04} ${x * 0.72} ${y * 0.5}`,
                `Q ${x * 1.06} ${y * 0.06} ${x} ${-y}`,
                `Q ${x * 0.05} ${-y * 0.78} ${-x} ${-y * 0.5}`,
                `Q ${-x * 1.04} ${0} ${-x * 0.88} ${y * 0.42}`,
                'Z'
            ].join(' ');
        }
        case 'rectangle':
            return roundedRect(-rx, -ry, w, h, Math.min(w, h) * 0.16);
        case 'square':
        default:
            return roundedRect(-rx, -ry, w, h, Math.min(w, h) * 0.22);
    }
}

function roundedRect(x, y, w, h, r) {
    return `M ${x + r} ${y} h ${w - 2 * r} a ${r} ${r} 0 0 1 ${r} ${r} v ${h - 2 * r} a ${r} ${r} 0 0 1 ${-r} ${r} h ${-(w - 2 * r)} a ${r} ${r} 0 0 1 ${-r} ${-r} v ${-(h - 2 * r)} a ${r} ${r} 0 0 1 ${r} ${-r} Z`;
}

/** Total width of the front in millimetres, used to scale against a face. */
export function frameWidthMm(specs) {
    return specs.lens * 2 + specs.bridge;
}

export function FrameShape({ product, variant, className = '', style }) {
    const { specs, shape } = product;
    const lensW = specs.lens;
    const lensH = Math.round(specs.lens * (shape === 'rectangle' ? 0.68 : shape === 'oval' ? 0.72 : 0.8));
    const totalW = frameWidthMm(specs);
    const offset = (specs.lens + specs.bridge) / 2;
    // Padding leaves room for the stroke and the temple stubs.
    const padX = 10;
    const padY = 8;
    const id = `${product.slug}-${variant.id}`;

    return (
        <svg
            className={className}
            style={style}
            viewBox={`${-totalW / 2 - padX} ${-lensH / 2 - padY} ${totalW + padX * 2} ${lensH + padY * 2}`}
            role="img"
            aria-label={`${product.name.en} ${variant.color.en}`}
        >
            <defs>
                <linearGradient id={`lens-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={variant.lensHex} stopOpacity="0.82" />
                    <stop offset="100%" stopColor={variant.lensHex} stopOpacity="0.55" />
                </linearGradient>
                <linearGradient id={`acetate-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={variant.hex} />
                    <stop offset="100%" stopColor={variant.hex} stopOpacity="0.86" />
                </linearGradient>
            </defs>

            {/* temples, angled back towards the ears */}
            <g stroke={`url(#acetate-${id})`} strokeWidth={lensH * 0.11} strokeLinecap="round" fill="none">
                <path d={`M ${-totalW / 2} ${-lensH * 0.22} L ${-totalW / 2 - padX * 0.8} ${-lensH * 0.3}`} />
                <path d={`M ${totalW / 2} ${-lensH * 0.22} L ${totalW / 2 + padX * 0.8} ${-lensH * 0.3}`} />
            </g>

            {/* bridge */}
            <path
                d={`M ${-specs.bridge / 2 - 1} ${-lensH * 0.12} Q 0 ${-lensH * 0.3} ${specs.bridge / 2 + 1} ${-lensH * 0.12}`}
                stroke={`url(#acetate-${id})`}
                strokeWidth={lensH * 0.13}
                fill="none"
                strokeLinecap="round"
            />

            {[-offset, offset].map((cx) => (
                // An asymmetric lens (the cat-eye) mirrors across the bridge so
                // both outer corners sweep away from the nose.
                <g key={cx} transform={`translate(${cx} 0)${shape === 'cat' && cx < 0 ? ' scale(-1 1)' : ''}`}>
                    <path d={lensPath(shape, lensW, lensH)} fill={`url(#lens-${id})`} />
                    <path
                        d={lensPath(shape, lensW, lensH)}
                        fill="none"
                        stroke={`url(#acetate-${id})`}
                        strokeWidth={lensH * 0.12}
                        strokeLinejoin="round"
                    />
                </g>
            ))}
        </svg>
    );
}
