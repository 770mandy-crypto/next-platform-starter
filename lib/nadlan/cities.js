// Cities Matzpen imports: CBS settlement code (סמל יישוב, the key nadlan.gov.il
// files its pages under), name, and a center point for the map. Adding a city
// is adding a row; the refresh job picks it up on its next cycle.

export const CITIES = [
    { code: '5000', id: 'tel-aviv', name: 'תל אביב-יפו', lat: 32.08, lng: 34.78 },
    { code: '3000', id: 'jerusalem', name: 'ירושלים', lat: 31.77, lng: 35.21 },
    { code: '4000', id: 'haifa', name: 'חיפה', lat: 32.8, lng: 35.0 },
    { code: '9000', id: 'beer-sheva', name: 'באר שבע', lat: 31.25, lng: 34.79 },
    { code: '8300', id: 'rishon', name: 'ראשון לציון', lat: 31.97, lng: 34.79 },
    { code: '7900', id: 'petah-tikva', name: 'פתח תקווה', lat: 32.09, lng: 34.89 },
    { code: '7400', id: 'netanya', name: 'נתניה', lat: 32.32, lng: 34.86 },
    { code: '70', id: 'ashdod', name: 'אשדוד', lat: 31.8, lng: 34.65 },
    { code: '6600', id: 'holon', name: 'חולון', lat: 32.02, lng: 34.78 },
    { code: '8600', id: 'ramat-gan', name: 'רמת גן', lat: 32.08, lng: 34.82 },
    { code: '6100', id: 'bnei-brak', name: 'בני ברק', lat: 32.09, lng: 34.83 },
    { code: '6200', id: 'bat-yam', name: 'בת ים', lat: 32.02, lng: 34.75 },
    { code: '8400', id: 'rehovot', name: 'רחובות', lat: 31.89, lng: 34.81 },
    { code: '7100', id: 'ashkelon', name: 'אשקלון', lat: 31.67, lng: 34.57 },
    { code: '6900', id: 'kfar-saba', name: 'כפר סבא', lat: 32.18, lng: 34.91 },
    { code: '6400', id: 'herzliya', name: 'הרצליה', lat: 32.17, lng: 34.84 },
    { code: '6500', id: 'hadera', name: 'חדרה', lat: 32.44, lng: 34.92 },
    { code: '1200', id: 'modiin', name: 'מודיעין-מכבים-רעות', lat: 31.9, lng: 35.01 },
    { code: '8700', id: 'raanana', name: 'רעננה', lat: 32.18, lng: 34.87 },
    { code: '2610', id: 'beit-shemesh', name: 'בית שמש', lat: 31.73, lng: 34.99 },
    { code: '8500', id: 'ramla', name: 'רמלה', lat: 31.93, lng: 34.87 },
    { code: '7000', id: 'lod', name: 'לוד', lat: 31.95, lng: 34.89 },
    { code: '9100', id: 'nahariya', name: 'נהריה', lat: 33.0, lng: 35.1 },
    { code: '2640', id: 'rosh-haayin', name: 'ראש העין', lat: 32.1, lng: 34.96 },
    { code: '9700', id: 'hod-hasharon', name: 'הוד השרון', lat: 32.15, lng: 34.89 },
    { code: '6300', id: 'givatayim', name: 'גבעתיים', lat: 32.07, lng: 34.81 },
    { code: '2660', id: 'yavne', name: 'יבנה', lat: 31.88, lng: 34.74 },
    { code: '2630', id: 'kiryat-gat', name: 'קריית גת', lat: 31.61, lng: 34.77 },
    { code: '2600', id: 'eilat', name: 'אילת', lat: 29.56, lng: 34.95 },
    { code: '7700', id: 'afula', name: 'עפולה', lat: 32.61, lng: 35.29 },
    { code: '7600', id: 'akko', name: 'עכו', lat: 32.93, lng: 35.08 },
    { code: '1139', id: 'karmiel', name: 'כרמיאל', lat: 32.92, lng: 35.3 },
    { code: '6700', id: 'tiberias', name: 'טבריה', lat: 32.79, lng: 35.53 },
    { code: '6800', id: 'kiryat-ata', name: 'קריית אתא', lat: 32.81, lng: 35.11 },
    { code: '2200', id: 'dimona', name: 'דימונה', lat: 31.07, lng: 35.03 }
];

export const cityById = Object.fromEntries(CITIES.map((c) => [c.id, c]));
export const cityByCode = Object.fromEntries(CITIES.map((c) => [c.code, c]));
