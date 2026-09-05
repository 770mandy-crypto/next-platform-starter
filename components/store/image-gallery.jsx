'use client';

import { useState } from 'react';

export function ImageGallery({ images, title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const imagesToShow = images && images.length > 0 ? images : [images[0]];

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
              aria-label={`View image ${i + 1}`}
              aria-current={i === activeIndex}
            >
              <img src={img} alt={`${title} view ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
