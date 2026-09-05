export function StoreFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <a className="mark" href="/store" style={{ alignItems: 'flex-start' }}>
              <span className="vs">AM</span>
              <span className="name">CLOTHING</span>
            </a>
            <p style={{ marginTop: '1rem' }}>קולקציית פתיחה בסדרה מוגבלת. שחור, לבן וזהב.</p>
          </div>
          <div>
            <h5>הקולקציה</h5>
            <ul>
              <li>חולצות</li>
              <li>מכנסיים</li>
              <li>סטים</li>
            </ul>
          </div>
          <div>
            <h5>מידע</h5>
            <ul>
              <li>המותג</li>
              <li>משלוחים והחזרות</li>
              <li>החשבון שלי</li>
            </ul>
          </div>
          <div>
            <h5>יצירת קשר</h5>
            <ul>
              <li>
                <span dir="ltr">hello@amclothing.co.il</span>
              </li>
              <li>
                <span dir="ltr">@am.clothing</span>
              </li>
              <li>משלוחים לכל הארץ, 3–5 ימי עסקים</li>
            </ul>
          </div>
        </div>
        <div className="foot-rule">
          <span>© AM CLOTHING 2026</span>
          <span>ALL RIGHTS RESERVED</span>
        </div>
      </div>
    </footer>
  );
}
