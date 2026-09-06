export const metadata = { title: 'טבלת מידות' };

// Measured flat on the garment itself, in centimetres — not a generic size chart.
const TEES = [
  { size: 'S', chest: 48, length: 68, sleeve: 20 },
  { size: 'M', chest: 51, length: 70, sleeve: 21 },
  { size: 'L', chest: 54, length: 72, sleeve: 22 },
  { size: 'XL', chest: 57, length: 74, sleeve: 23 },
  { size: 'XXL', chest: 60, length: 76, sleeve: 24 }
];

const SHORTS = [
  { size: 'S', waist: 36, length: 46, thigh: 30 },
  { size: 'M', waist: 38, length: 47, thigh: 31 },
  { size: 'L', waist: 40, length: 48, thigh: 32 },
  { size: 'XL', waist: 42, length: 49, thigh: 33 },
  { size: 'XXL', waist: 44, length: 50, thigh: 34 }
];

export default function SizesPage() {
  return (
    <>
      <div className="wrap page-head">
        <h1>טבלת מידות</h1>
        <p>
          כל המספרים כאן נמדדו על הפריט עצמו כשהוא שטוח, בסנטימטרים. הדרך הכי מדויקת לבחור: קחו פריט שיושב עליכם טוב,
          מדדו אותו באותו אופן, והשוו.
        </p>
      </div>

      <div className="wrap">
        <div className="prose" style={{ maxWidth: 'none' }}>
          <h2>חולצות</h2>
        </div>
        <div className="table-wrap">
          <table className="size-table">
            <thead>
              <tr>
                <th>מידה</th>
                <th>חצי היקף חזה</th>
                <th>אורך גוף</th>
                <th>אורך שרוול</th>
              </tr>
            </thead>
            <tbody>
              {TEES.map((r) => (
                <tr key={r.size}>
                  <td>{r.size}</td>
                  <td>{r.chest} ס״מ</td>
                  <td>{r.length} ס״מ</td>
                  <td>{r.sleeve} ס״מ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="prose" style={{ maxWidth: 'none' }}>
          <h2>מכנסיים</h2>
        </div>
        <div className="table-wrap">
          <table className="size-table">
            <thead>
              <tr>
                <th>מידה</th>
                <th>חצי היקף מותן</th>
                <th>אורך צד</th>
                <th>חצי היקף ירך</th>
              </tr>
            </thead>
            <tbody>
              {SHORTS.map((r) => (
                <tr key={r.size}>
                  <td>{r.size}</td>
                  <td>{r.waist} ס״מ</td>
                  <td>{r.length} ס״מ</td>
                  <td>{r.thigh} ס״מ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="prose">
          <h2>איך למדוד</h2>
          <p>
            <strong>חזה ומותן</strong> — הניחו את הפריט שטוח על שולחן ומדדו מקצה לקצה מתחת לבתי השחי (או בקו המותן).
            זה חצי היקף; להיקף מלא הכפילו בשתיים.
          </p>
          <p>
            <strong>אורך גוף</strong> — מנקודת החיבור של הכתף לצוואר ועד לשולי החולצה.
          </p>
          <p>
            <strong>בין שתי מידות?</strong> הגזרה שלנו ישרה ולא צמודה. מי שאוהב מראה נקי — קחו את הקטנה; מי שאוהב קצת
            אוויר — הגדולה. החלפת מידה ראשונה תמיד על חשבוננו.
          </p>
        </div>
      </div>
    </>
  );
}
