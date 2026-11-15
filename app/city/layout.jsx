import './city.css';

export const metadata = {
    title: { absolute: 'עיר המעלות — עיר פתוחה תלת־ממדית' },
    description: 'עיר פתוחה תלת־ממדית לחקירה: מדרגות וגגות, נהיגה, טיסה במסוק ותושבים שאפשר לדבר איתם.'
};

export const viewport = {
    themeColor: '#0b1720',
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover'
};

export default function CityLayout({ children }) {
    return children;
}
