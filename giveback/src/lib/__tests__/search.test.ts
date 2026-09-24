import { matches, normalize, tokenVariants } from '../search';

describe('Hebrew search', () => {
  it('drops niqqud and folds final letters', () => {
    expect(normalize('סְפָרִים')).toBe('ספרימ');
  });

  it('strips an attached prefix and plural/construct endings', () => {
    expect(tokenVariants('השידה')).toEqual(expect.arrayContaining(['השידה', 'שידה', 'שיד']));
    expect(tokenVariants(normalize('כיסאות'))).toContain('כיסא');
  });

  it('matches the way people actually type', () => {
    const listing = 'עגלת תינוק במצב מעולה, רמת גן';
    expect(matches(listing, 'עגלה')).toBe(true);
    expect(matches(listing, 'העגלה לתינוק')).toBe(true);
    expect(matches(listing, 'שידה')).toBe(false);
    expect(matches('כיסא משרדי', 'כיסאות')).toBe(true);
  });
});
