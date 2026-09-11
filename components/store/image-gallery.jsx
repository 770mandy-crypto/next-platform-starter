'use client';

import { useState } from 'react';

export function ImageGallery({ images, title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  // A product may carry one photograph or several; `images` can also arrive
  // empty if the row has no gallery yet, and indexing into it would throw.
  const imagesToShow = (images || []).filter(Boolean);

  if (imagesToShow.length === 0) return null;

  return (
    <div className="gallery-container">
      <div className="gallery-main">
        <img src={imagesToShow[activeIndex]} alt={title} />
      </div>
      {imagesToShow.length > 1 && (
        <div className="gallery-thumbs">
          {imagesToShow.map((img, i) => (
            <button
              key={i}
              className={`thumb${i === activeIndex ? ' active' : ''}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`תמונה ${i + 1}`}
              aria-current={i === activeIndex}
            >
              <img src={img} alt={`${title} — תמונה ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
