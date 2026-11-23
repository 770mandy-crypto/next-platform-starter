export const metadata = {
    title: 'ניהול משלוחים'
};

export default function DeliveryLayout({ children }) {
    return (
        <div dir="rtl" className="text-right">
            {children}
        </div>
    );
}
