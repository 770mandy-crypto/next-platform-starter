import { PublishForm } from 'components/matzpen/publish-form';
import { loadDataset } from 'lib/nadlan/dataset';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'פרסום דירה' };

export default async function PublishPage({ searchParams }) {
    const { area } = await searchParams;
    const data = await loadDataset();
    const areas = data.areas.map(({ id, name, city, cityName, price, score }) => ({ id, name, city, cityName, price, score }));
    return (
        <main className="mx-auto max-w-2xl p-4">
            <h1 className="mb-1 text-2xl font-black">פרסום דירה למכירה</h1>
            <p className="mb-5 text-slate-600">בחינם, בלי עמלת תיווך. הקונים פונים אליכם ישירות.</p>
            <PublishForm areas={areas} cities={data.cities.map(({ id, name }) => ({ id, name }))} initialArea={typeof area === 'string' ? area : ''} />
        </main>
    );
}
