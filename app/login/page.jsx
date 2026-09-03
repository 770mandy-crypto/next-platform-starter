import { Suspense } from 'react';
import { LoginForm } from 'components/auth/login-form';
import { isGoogleConfigured } from 'lib/auth.js';

export const metadata = {
    title: 'התחברות — שוקי'
};

export default function LoginPage() {
    return (
        <div dir="rtl" className="flex flex-col items-center max-w-md gap-8 mx-auto">
            <header className="flex flex-col items-center gap-2 text-center">
                <h1>🔐 התחברות</h1>
                <p className="opacity-70">היכנס כדי לראות את האזור האישי שלך ואת רשימת המניות שאתה עוקב אחריהן.</p>
            </header>

            <Suspense>
                <LoginForm googleEnabled={isGoogleConfigured()} />
            </Suspense>
        </div>
    );
}
