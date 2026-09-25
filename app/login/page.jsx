import { LoginForm } from 'components/auth/login-form';

export const metadata = {
    title: 'התחברות — FixNow'
};

export default function LoginPage() {
    return (
        <div dir="rtl" className="flex flex-col gap-8 py-12">
            <header className="flex flex-col gap-3 text-center">
                <h1 className="text-4xl font-bold">FixNow</h1>
                <p className="text-lg opacity-80">חיבור קל בין לקוחות לבעלי מקצוע</p>
            </header>

            <LoginForm />
        </div>
    );
}
