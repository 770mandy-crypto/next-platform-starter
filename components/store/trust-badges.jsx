const BADGES = [
    { icon: '🔒', title: 'Secure checkout', subtitle: 'Powered by Stripe' },
    { icon: '🚚', title: 'Free shipping', subtitle: 'On every order' },
    { icon: '↩️', title: '30-day returns', subtitle: 'Easy & hassle-free' },
    { icon: '💬', title: 'Friendly support', subtitle: 'We reply within a day' }
];

export function TrustBadges({ className }) {
    return (
        <div
            className={[
                'grid grid-cols-2 gap-4 sm:grid-cols-4',
                className
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {BADGES.map((badge) => (
                <div key={badge.title} className="flex flex-col items-center gap-1 text-center">
                    <span className="text-2xl">{badge.icon}</span>
                    <span className="text-sm font-semibold text-neutral-100">{badge.title}</span>
                    <span className="text-xs text-neutral-400">{badge.subtitle}</span>
                </div>
            ))}
        </div>
    );
}
