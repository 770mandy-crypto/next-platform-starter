import { RegisterForm } from 'components/auth/register-form';

export const metadata = {
    title: 'הרשמה — FixNow'
};

export default function RegisterPage() {
    return (
        <div dir="rtl" className="flex flex-col gap-8 py-12">
            <header className="flex flex-col gap-3 text-center">
                <h1 className="text-4xl font-bold">FixNow</h1>
                <p className="text-lg opacity-80">חיבור קל בין לקוחות לבעלי מקצוע</p>
            </header>

            <RegisterForm />
        </div>
    );
}
