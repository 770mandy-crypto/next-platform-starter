import { WishlistView } from '../../../components/shop/wishlist-view';

export const metadata = {
    title: 'המועדפים שלי',
    description: 'הפריטים ששמרתם. נשמר במכשיר שלכם בלבד.',
    alternates: { canonical: '/wishlist' },
    robots: { index: false }
};

export default function Page() {
    return <WishlistView />;
}
