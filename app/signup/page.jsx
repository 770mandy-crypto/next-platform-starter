import { SignupForm } from 'components/auth/signup-form';
import { isGoogleConfigured } from 'lib/auth.js';

export const metadata = {
    title: 'הרשמה — שוקי'
};

export default function SignupPage() {
    return (
        <div dir="rtl" className="flex flex-col items-center max-w-md gap-8 mx-auto">
            <header className="flex flex-col items-center gap-2 text-center">
                <h1>✍️ הרשמה</h1>
                <p className="opacity-70">צור חשבון כדי לשמור רשימת מניות אישית ולקבל אליה גישה מכל מכשיר.</p>
            </header>

            <SignupForm googleEnabled={isGoogleConfigured()} />
        </div>
    );
}
