// Sample airlines. type drives price level, baggage and amenities in the generator.
// color is only used for the small logo chip in the UI (no real logos).
export const AIRLINES = [
  { code: 'PK', name: 'PIA', type: 'full', priceLevel: 1.0, color: '#0B7A3E' },
  { code: 'PA', name: 'Airblue', type: 'budget', priceLevel: 0.82, color: '#1E5BC6' },
  { code: 'EK', name: 'Emirates', type: 'premium', priceLevel: 1.32, color: '#D71920' },
  { code: 'QR', name: 'Qatar Airways', type: 'premium', priceLevel: 1.28, color: '#7A1F3D' },
  { code: 'EY', name: 'Etihad', type: 'premium', priceLevel: 1.22, color: '#B08D57' },
  { code: 'TK', name: 'Turkish Airlines', type: 'full', priceLevel: 1.08, color: '#C8102E' },
  { code: 'SV', name: 'Saudia', type: 'full', priceLevel: 1.02, color: '#1F7A4D' },
  { code: 'FZ', name: 'flydubai', type: 'budget', priceLevel: 0.78, color: '#E4572E' },
  { code: 'G9', name: 'Air Arabia', type: 'budget', priceLevel: 0.75, color: '#D62839' },
  { code: 'SQ', name: 'Singapore Airlines', type: 'premium', priceLevel: 1.35, color: '#F5A623' },
  { code: 'BA', name: 'British Airways', type: 'full', priceLevel: 1.12, color: '#2B4C9B' },
  { code: 'CZ', name: 'China Southern', type: 'full', priceLevel: 0.98, color: '#1B75BC' },
];

const BY_CODE = Object.fromEntries(AIRLINES.map((a) => [a.code, a]));
export const getAirline = (code) => BY_CODE[code];
