import { NewItemForm } from 'components/giveback/new-item-form';

export const metadata = { title: 'למסור חפץ' };

export default function NewItemPage() {
    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
                <h1>למסור חפץ</h1>
                <p className="opacity-80">דקה אחת, ומישהו בשכונה ישמח. הכתובת נשארת פרטית עד שתחליטו לשלוח אותה.</p>
            </header>
            <NewItemForm />
        </div>
    );
}
