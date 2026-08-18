import { BrandMark } from 'components/store/brand-mark';

/*
Product renderings.

These stand in for the studio photography: a vector tee and sweat shorts, each in
black or white, with the gold lockup overlaid at the position it occupies on the
real garments — right of the chest on the tee, lower right leg on the shorts.

A black garment on a black page needs help to read at all, so each colourway
carries its own ground and a rim light along the shoulders and sleeve caps. That
rim is what separates the black tee from the background.

To swap in real photos later, give a product a `photo` path in data/products.js
and this component renders that instead — nothing else has to change.
*/

const SURFACE = {
    black: {
        fill: '#1f1f24',
        fillDeep: '#141418',
        seam: '#3d3d46',
        rim: '#6a6a78',
        shade: '#0d0d10',
        ground: 'radial-gradient(115% 85% at 50% 12%, #121216 0%, #08080a 58%, #050506 100%)'
    },
    white: {
        fill: '#f4f2ed',
        fillDeep: '#ddd9d0',
        seam: '#c6c1b6',
        rim: '#ffffff',
        shade: '#b3ada1',
        ground: 'radial-gradient(115% 85% at 50% 12%, #2a2a2e 0%, #141417 55%, #0a0a0b 100%)'
    }
};

const NECK = 'M226,132 C252,158 274,170 300,170 C326,170 348,158 374,132';

function Tee({ tone }) {
    const s = SURFACE[tone];
    return (
        <svg viewBox="0 0 600 720" className="w-full h-full" role="presentation" focusable="false">
            <defs>
                <linearGradient id={`tee-${tone}`} x1="0.15" y1="0" x2="0.9" y2="1">
                    <stop offset="0" stopColor={s.fill} />
                    <stop offset="0.6" stopColor={s.fill} />
                    <stop offset="1" stopColor={s.fillDeep} />
                </linearGradient>
            </defs>

            <path
                d={`${NECK}
                    L482,170 C489,173 493,181 490,189 L456,302 C453,310 444,314 436,310 L406,296
                    L406,634 C406,640 402,644 396,644 L204,644 C198,644 194,640 194,634 L194,296
                    L164,310 C156,314 147,310 144,302 L110,189 C107,181 111,173 118,170 Z`}
                fill={`url(#tee-${tone})`}
                stroke={s.seam}
                strokeWidth="2"
                strokeLinejoin="round"
            />

            {/* rim light along the shoulders and sleeve caps — this is what lifts
                the black colourway off the black ground */}
            <path
                d="M226,132 L118,170 C111,173 107,181 110,189 L144,302"
                fill="none"
                stroke={s.rim}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.55"
            />
            <path
                d="M374,132 L482,170 C489,173 493,181 490,189 L456,302"
                fill="none"
                stroke={s.rim}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.35"
            />

            {/* collar rib */}
            <path d={NECK} fill="none" stroke={s.seam} strokeWidth="11" strokeLinecap="round" />
            <path d={NECK} fill="none" stroke={s.rim} strokeWidth="2" strokeLinecap="round" opacity="0.5" />

            {/* sleeve seams and body drape */}
            <path d="M406,296 L406,266" fill="none" stroke={s.seam} strokeWidth="2" opacity="0.8" />
            <path d="M194,296 L194,266" fill="none" stroke={s.seam} strokeWidth="2" opacity="0.8" />
            <path d="M232,320 C224,412 226,516 234,622" fill="none" stroke={s.shade} strokeWidth="3" opacity="0.4" />
            <path d="M368,320 C376,412 374,516 366,622" fill="none" stroke={s.shade} strokeWidth="3" opacity="0.4" />
            <path d="M194,628 H406" fill="none" stroke={s.seam} strokeWidth="2" opacity="0.7" />
        </svg>
    );
}

function Shorts({ tone }) {
    const s = SURFACE[tone];
    return (
        <svg viewBox="0 0 600 720" className="w-full h-full" role="presentation" focusable="false">
            <defs>
                <linearGradient id={`sh-${tone}`} x1="0.15" y1="0" x2="0.9" y2="1">
                    <stop offset="0" stopColor={s.fill} />
                    <stop offset="0.62" stopColor={s.fill} />
                    <stop offset="1" stopColor={s.fillDeep} />
                </linearGradient>
            </defs>

            {/* legs */}
            <path
                d="M140,186 H460 L452,566 H318 L300,382 L282,566 H148 Z"
                fill={`url(#sh-${tone})`}
                stroke={s.seam}
                strokeWidth="2"
                strokeLinejoin="round"
            />

            {/* waistband */}
            <path
                d="M140,124 H460 V186 H140 Z"
                fill={`url(#sh-${tone})`}
                stroke={s.seam}
                strokeWidth="2"
                strokeLinejoin="round"
            />
            {Array.from({ length: 15 }, (_, i) => (
                <line
                    key={i}
                    x1={152 + i * 21}
                    y1="130"
                    x2={152 + i * 21}
                    y2="180"
                    stroke={s.shade}
                    strokeWidth="2"
                    opacity="0.35"
                />
            ))}

            {/* rim light down the left edge */}
            <path
                d="M140,124 V186 L148,566"
                fill="none"
                stroke={s.rim}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.5"
            />

            {/* drawstring with gold aglets */}
            <path d="M284,168 C280,214 274,240 270,268" fill="none" stroke={s.seam} strokeWidth="8" strokeLinecap="round" />
            <path d="M316,168 C320,218 326,244 330,272" fill="none" stroke={s.seam} strokeWidth="8" strokeLinecap="round" />
            <rect x="263" y="266" width="14" height="36" rx="3" fill="#c2a15e" />
            <rect x="323" y="270" width="14" height="36" rx="3" fill="#c2a15e" />

            {/* pockets, inseam and hems */}
            <path d="M168,200 C168,254 180,292 196,320" fill="none" stroke={s.shade} strokeWidth="3" opacity="0.45" />
            <path d="M432,200 C432,254 420,292 404,320" fill="none" stroke={s.shade} strokeWidth="3" opacity="0.45" />
            <path d="M300,382 L300,566" fill="none" stroke={s.shade} strokeWidth="2" opacity="0.3" />
            <path d="M149,538 H283" fill="none" stroke={s.seam} strokeWidth="2" opacity="0.7" />
            <path d="M317,538 H451" fill="none" stroke={s.seam} strokeWidth="2" opacity="0.7" />
        </svg>
    );
}

/*
Where the lockup sits on each garment. These use physical `right`, not a logical
property: the frame is a photograph of a garment, so it must not mirror with the
page's right-to-left direction the way UI chrome does.
*/
const LOGO_PLACEMENT = {
    tee: { top: '30%', right: '27%', scale: 0.3 },
    shorts: { top: '57%', right: '28%', scale: 0.26 }
};

export function GarmentShot({ product, className = '', priority = false }) {
    const { cut, tone, photo, title } = product;
    const surface = SURFACE[tone] ?? SURFACE.black;
    const place = LOGO_PLACEMENT[cut] ?? LOGO_PLACEMENT.tee;

    if (photo) {
        return (
            <div className={`relative overflow-hidden ${className}`} style={{ background: surface.ground }}>
                <img
                    src={photo}
                    alt={title}
                    loading={priority ? 'eager' : 'lazy'}
                    className="object-cover w-full h-full"
                />
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`} style={{ background: surface.ground }}>
            <div className="absolute inset-0 flex items-center justify-center p-[5%]">
                {cut === 'shorts' ? <Shorts tone={tone} /> : <Tee tone={tone} />}
            </div>

            <div className="absolute" style={{ top: place.top, right: place.right }} aria-hidden="true">
                <BrandMark scale={place.scale} />
            </div>
        </div>
    );
}
