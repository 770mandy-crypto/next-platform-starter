import { KINDS } from 'lib/letters/writer';
import { LetterWriter } from './letter-writer';

export default function LettersPage() {
    return <LetterWriter kinds={Object.entries(KINDS)} />;
}
