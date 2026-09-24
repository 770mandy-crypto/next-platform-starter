import { distanceKm, formatDistance, googleMapsLink, isInIsrael, nearestCity, wazeLink } from '../geo';

const TLV = { lat: 32.0853, lng: 34.7818 };
const RAMAT_GAN = { lat: 32.0684, lng: 34.8248 };
const HAIFA = { lat: 32.794, lng: 34.9896 };

describe('distance', () => {
  it('matches known city distances', () => {
    expect(distanceKm(TLV, RAMAT_GAN)).toBeCloseTo(4.4, 0);
    expect(Math.abs(distanceKm(TLV, HAIFA) - 81)).toBeLessThan(3);
  });

  it('formats in Hebrew units', () => {
    expect(formatDistance(0.34)).toBe('300 מ׳');
    expect(formatDistance(0.02)).toBe('100 מ׳');
    expect(formatDistance(2.46)).toBe('2.5 ק״מ');
    expect(formatDistance(23.4)).toBe('23 ק״מ');
    expect(formatDistance(null)).toBe('');
  });

  it('finds the nearest city and recognises Israel', () => {
    expect(nearestCity({ lat: 32.07, lng: 34.823 }).name).toBe('רמת גן');
    expect(isInIsrael(TLV)).toBe(true);
    expect(isInIsrael({ lat: 51.5, lng: -0.12 })).toBe(false);
  });
});

describe('navigation links', () => {
  it('sends Waze straight to exact coordinates when known', () => {
    expect(wazeLink({ lat: 32.1, lng: 34.8, address: 'הרצל 5' })).toBe('https://waze.com/ul?ll=32.1,34.8&navigate=yes');
  });

  it('falls back to the address text', () => {
    expect(wazeLink({ address: 'הרצל 5, רחובות' })).toBe(
      `https://waze.com/ul?q=${encodeURIComponent('הרצל 5, רחובות')}&navigate=yes`,
    );
    expect(wazeLink({ lat: null, lng: null, address: null })).toBeNull();
  });

  it('builds a Google Maps directions link', () => {
    expect(googleMapsLink({ lat: 32.1, lng: 34.8 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=32.1%2C34.8',
    );
  });
});
