const ITEMS = [
  <>
    AM CLOTHING <b>2026</b>
  </>,
  'רקמת זהב, לא הדפס',
  <>
    משלוח <b>חינם</b> לכל הארץ
  </>,
  <>
    כותנה מסורקת <b>240</b> גרם למ״ר
  </>,
  'סדרה מוגבלת'
];

export function Ticker() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  );
}
