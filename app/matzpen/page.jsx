import { Explorer } from 'components/matzpen/explorer';
import { cities, IS_SAMPLE_DATA } from 'lib/nadlan/areas';
import { rankedAreas } from 'lib/nadlan/score';

export default function MatzpenPage() {
    return <Explorer areas={rankedAreas()} cities={cities} isSample={IS_SAMPLE_DATA} />;
}
