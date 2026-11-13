export const metadata = {
    title: 'בוט פגישות',
    description: 'עוזר AI שמצטרף לפגישות Google Meet, Zoom ו-Teams: מקשיב, עונה בקול, מסכם ומכין מצגות.'
};

export default function MeetLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew text-slate-100 bg-slate-950 min-h-[100dvh]">
            {children}
        </div>
    );
}
