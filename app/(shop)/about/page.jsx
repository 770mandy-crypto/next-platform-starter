import { AboutView } from '../../../components/store/views';

export const metadata = {
    title: 'הסיפור',
    description: 'איך נבחרים הפריטים ב-MAOR: חומר קודם, דגימה לפני הזמנה, וחודש שימוש לפני שמוכרים.',
    alternates: { canonical: '/about' }
};

export default function Page() {
    return <AboutView />;
}
