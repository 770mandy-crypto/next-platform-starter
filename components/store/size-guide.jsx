'use client';

import { useState } from 'react';

const TEES_SIZES = [
  { size: 'S', length: '68', width: '47' },
  { size: 'M', length: '71', width: '51' },
  { size: 'L', length: '74', width: '55' },
  { size: 'XL', length: '77', width: '59' },
  { size: 'XXL', length: '80', width: '63' },
];

const SHORTS_SIZES = [
  { size: 'S', length: '42', width: '35' },
  { size: 'M', length: '44', width: '38' },
  { size: 'L', length: '46', width: '41' },
  { size: 'XL', length: '48', width: '44' },
  { size: 'XXL', length: '50', width: '47' },
];

function getSizeChart(category) {
  if (category === 'tees' || category === 'sets') {
    return { name: 'חולצה', sizes: TEES_SIZES, note: '(אורך × רוחב כתף)' };
  }
  return { name: 'מכנסיים', sizes: SHORTS_SIZES, note: '(אורך × רוחב במותן)' };
}

export function SizeGuide({ category }) {
  const [open, setOpen] = useState(false);
  const chart = getSizeChart(category);

  return (
    <>
      <button
        className="size-guide-btn"
        onClick={() => setOpen(true)}
        aria-label="פתח מדריך גדלים"
      >
        מדריך גדלים
      </button>

      {open && (
        <>
          <div className="modal-scrim" onClick={() => setOpen(false)} />
          <div className="modal-dialog">
            <div className="modal-head">
              <h3>מדריך גדלים • {chart.name}</h3>
              <button
                className="modal-close"
                onClick={() => setOpen(false)}
                aria-label="סגור"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-note">
                מדידות בסנטימטרים {chart.note}
              </p>
              <div className="size-table">
                <div className="table-head">
                  <div>גדל</div>
                  <div>מידה 1</div>
                  <div>מידה 2</div>
                </div>
                {chart.sizes.map((row) => (
                  <div key={row.size} className="table-row">
                    <div className="size-label">{row.size}</div>
                    <div>{row.length}</div>
                    <div>{row.width}</div>
                  </div>
                ))}
              </div>
              <p className="modal-tip">
                מדוד פריט שמתאים לך והשווה למדידות בטבלה. כל הטי-שרטים וקצרים נתלים ישר — לא צמודים ולא אוברסייז.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
