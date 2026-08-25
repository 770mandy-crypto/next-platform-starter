import { GamesFrame } from 'components/games/games-frame';
import { LanguageProvider } from 'components/games/language';

export const metadata = {
    title: 'Arcade'
};

export default function GamesLayout({ children }) {
    return (
        <LanguageProvider>
            <GamesFrame>{children}</GamesFrame>
        </LanguageProvider>
    );
}
