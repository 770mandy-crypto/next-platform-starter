import { FitQuiz } from '../../../components/shop/fit-quiz';

export const metadata = {
    title: 'התאמת משקפיים',
    description: 'שלוש שאלות קצרות, ואנחנו מציעים את המסגרת שמתאימה לפנים שלכם.',
    alternates: { canonical: '/fit' }
};

export default function Page() {
    return <FitQuiz />;
}
