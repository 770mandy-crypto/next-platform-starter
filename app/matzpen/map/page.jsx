import { Explorer } from 'components/matzpen/explorer';
import { lean } from 'components/matzpen/format';
import { loadDataset } from 'lib/nadlan/dataset';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'מפת השכונות' };

export default async function MapPage() {
    const data = await loadDataset();
    return <Explorer areas={data.areas.map(lean)} cities={data.cities} />;
}
