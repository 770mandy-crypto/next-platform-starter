import { SalesShell } from 'components/sales/shell';

export const metadata = {
    title: 'AI Sales Agent — סוכן מכירות AI',
    description: 'סוכן מכירות AI לשיחות נכנסות ויוצאות, על בסיס הידע המאומת של העסק.'
};

export default function SalesLayout({ children }) {
    return <SalesShell>{children}</SalesShell>;
}
