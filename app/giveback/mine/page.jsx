import { MyItems } from 'components/giveback/my-items';

export const metadata = { title: 'הפריטים שלי' };

export default function MyItemsPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1>הפריטים שלי</h1>
            <p className="opacity-80">פתחו פריט כדי לסמן אותו כ״נמסר״ או ״שמור למישהו״.</p>
            <MyItems />
        </div>
    );
}
