import { Search } from 'components/giveback/search';

export default function GiveBackHome() {
    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
                <h1>מה שכבר לא צריך — למישהו ממש קרוב</h1>
                <p className="max-w-2xl text-lg opacity-80">
                    חפשו רהיטים, צעצועים, ספרים וציוד לבית שהשכנים מוסרים בחינם. הקרוב ביותר אליכם מופיע ראשון.
                </p>
            </header>
            <Search />
        </div>
    );
}
