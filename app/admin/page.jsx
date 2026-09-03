import { redirect } from 'next/navigation';
import { Card } from 'components/card';
import { isAdmin } from './auth';
import { LogoutButton } from './logout-button';

export const metadata = {
    title: 'ניהול'
};

export default async function AdminHome() {
    if (!(await isAdmin())) {
        redirect('/admin/login');
    }

    return (
        <div className="max-w-sm mx-auto mt-16 flex flex-col gap-4" dir="rtl">
            <Card title="שלום, מנדי המלך">
                <p>אזור הניהול מוגן בסיסמה. אתה מחובר.</p>
                <LogoutButton />
            </Card>
        </div>
    );
}
