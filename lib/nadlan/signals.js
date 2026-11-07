// Curated growth drivers per neighborhood: light rail and train lines, approved
// urban renewal, big employment centers. These are not in the official price
// data, so they are added by hand, and only after checking a source (a
// planning-committee decision, a transport ministry plan). An area listed here
// gets the "growth drivers" part of the score; an area that is not listed is
// scored without it rather than as if it had none.
//
// Shape: { [cityId]: { [neighborhood name exactly as nadlan.gov.il writes it]:
//          [{ kind: 'transport' | 'renewal' | 'development' | 'employment', text, source }] } }
//
// Example (do not add entries without a source):
//   'tel-aviv': {
//       'יד אליהו': [{ kind: 'transport', text: 'הקו הסגול של הרכבת הקלה', source: 'https://...' }]
//   }

export const SIGNALS = {};
