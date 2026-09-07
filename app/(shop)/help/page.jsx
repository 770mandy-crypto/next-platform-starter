import { HelpView } from '../../../components/store/views';

export const metadata = {
    title: 'שירות',
    description: 'משלוחים, החזרות, החלפות וטיפול בפריטים — כל התשובות במקום אחד.',
    alternates: { canonical: '/help' }
};

export default function Page() {
    return <HelpView />;
}
