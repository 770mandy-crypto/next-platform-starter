import { ProductTracker } from './product-tracker';

export const metadata = {
    title: 'ניהול תוקף מוצרים'
};

export default function InventoryPage() {
    return (
        <div className="flex flex-col gap-8">
            <section dir="rtl" className="text-right">
                <h1 className="mb-4">ניהול תוקף מוצרים</h1>
                <p className="text-lg text-white/80">
                    מעקב אחר תאריכי התפוגה של המוצרים שלכם. הוסיפו מוצר עם תאריך תפוגה וקבלו התראה חזותית לפני שהתוקף פג.
                    הנתונים נשמרים מקומית בדפדפן שלכם.
                </p>
            </section>
            <ProductTracker />
        </div>
    );
}
