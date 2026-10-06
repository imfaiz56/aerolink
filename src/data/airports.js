// Sample airport data. utc = standard UTC offset in hours (DST ignored on purpose).
// hub: true means the airport can be used as a connection point.
export const AIRPORTS = [
  { code: 'ISB', city: 'Islamabad', name: 'Islamabad International Airport', country: 'Pakistan', cc: 'PK', lat: 33.5607, lng: 73.0993, utc: 5 },
  { code: 'LHE', city: 'Lahore', name: 'Allama Iqbal International Airport', country: 'Pakistan', cc: 'PK', lat: 31.5216, lng: 74.4036, utc: 5 },
  { code: 'KHI', city: 'Karachi', name: 'Jinnah International Airport', country: 'Pakistan', cc: 'PK', lat: 24.9065, lng: 67.1608, utc: 5 },
  { code: 'PEW', city: 'Peshawar', name: 'Bacha Khan International Airport', country: 'Pakistan', cc: 'PK', lat: 33.9939, lng: 71.5146, utc: 5 },
  { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'UAE', cc: 'AE', lat: 25.2532, lng: 55.3657, utc: 4, hub: true },
  { code: 'AUH', city: 'Abu Dhabi', name: 'Zayed International Airport', country: 'UAE', cc: 'AE', lat: 24.433, lng: 54.6511, utc: 4, hub: true },
  { code: 'DOH', city: 'Doha', name: 'Hamad International Airport', country: 'Qatar', cc: 'QA', lat: 25.2731, lng: 51.6081, utc: 3, hub: true },
  { code: 'JED', city: 'Jeddah', name: 'King Abdulaziz International Airport', country: 'Saudi Arabia', cc: 'SA', lat: 21.6796, lng: 39.1565, utc: 3 },
  { code: 'RUH', city: 'Riyadh', name: 'King Khalid International Airport', country: 'Saudi Arabia', cc: 'SA', lat: 24.9576, lng: 46.6988, utc: 3 },
  { code: 'IST', city: 'Istanbul', name: 'Istanbul Airport', country: 'Türkiye', cc: 'TR', lat: 41.2753, lng: 28.7519, utc: 3, hub: true },
  { code: 'CAI', city: 'Cairo', name: 'Cairo International Airport', country: 'Egypt', cc: 'EG', lat: 30.1219, lng: 31.4056, utc: 2 },
  { code: 'LHR', city: 'London', name: 'Heathrow Airport', country: 'United Kingdom', cc: 'GB', lat: 51.47, lng: -0.4543, utc: 0, hub: true },
  { code: 'MAN', city: 'Manchester', name: 'Manchester Airport', country: 'United Kingdom', cc: 'GB', lat: 53.3537, lng: -2.275, utc: 0 },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle Airport', country: 'France', cc: 'FR', lat: 49.0097, lng: 2.5479, utc: 1 },
  { code: 'FRA', city: 'Frankfurt', name: 'Frankfurt Airport', country: 'Germany', cc: 'DE', lat: 50.0379, lng: 8.5622, utc: 1, hub: true },
  { code: 'AMS', city: 'Amsterdam', name: 'Schiphol Airport', country: 'Netherlands', cc: 'NL', lat: 52.3105, lng: 4.7683, utc: 1, hub: true },
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International Airport', country: 'United States', cc: 'US', lat: 40.6413, lng: -73.7781, utc: -5 },
  { code: 'YYZ', city: 'Toronto', name: 'Toronto Pearson International Airport', country: 'Canada', cc: 'CA', lat: 43.6777, lng: -79.6248, utc: -5 },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International Airport', country: 'United States', cc: 'US', lat: 33.9416, lng: -118.4085, utc: -8 },
  { code: 'DEL', city: 'Delhi', name: 'Indira Gandhi International Airport', country: 'India', cc: 'IN', lat: 28.5562, lng: 77.1, utc: 5.5 },
  { code: 'SIN', city: 'Singapore', name: 'Changi Airport', country: 'Singapore', cc: 'SG', lat: 1.3644, lng: 103.9915, utc: 8, hub: true },
  { code: 'KUL', city: 'Kuala Lumpur', name: 'Kuala Lumpur International Airport', country: 'Malaysia', cc: 'MY', lat: 2.7456, lng: 101.7099, utc: 8 },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport', country: 'Thailand', cc: 'TH', lat: 13.69, lng: 100.7501, utc: 7 },
  { code: 'HKG', city: 'Hong Kong', name: 'Hong Kong International Airport', country: 'Hong Kong', cc: 'HK', lat: 22.308, lng: 113.9185, utc: 8, hub: true },
  { code: 'CAN', city: 'Guangzhou', name: 'Baiyun International Airport', country: 'China', cc: 'CN', lat: 23.3924, lng: 113.2988, utc: 8 },
  { code: 'PVG', city: 'Shanghai', name: 'Pudong International Airport', country: 'China', cc: 'CN', lat: 31.1443, lng: 121.8083, utc: 8 },
  { code: 'PEK', city: 'Beijing', name: 'Capital International Airport', country: 'China', cc: 'CN', lat: 40.0799, lng: 116.5844, utc: 8 },
  { code: 'ICN', city: 'Seoul', name: 'Incheon International Airport', country: 'South Korea', cc: 'KR', lat: 37.4602, lng: 126.4407, utc: 9 },
  { code: 'NRT', city: 'Tokyo', name: 'Narita International Airport', country: 'Japan', cc: 'JP', lat: 35.772, lng: 140.3929, utc: 9 },
  { code: 'SYD', city: 'Sydney', name: 'Kingsford Smith Airport', country: 'Australia', cc: 'AU', lat: -33.9399, lng: 151.1753, utc: 10 },
    { code: 'MCT', city: 'Muscat', name: 'Muscat International Airport', country: 'Oman', cc: 'OM', lat: 23.5933, lng: 58.2844, utc: 4 },
  { code: 'BAH', city: 'Bahrain', name: 'Bahrain International Airport', country: 'Bahrain', cc: 'BH', lat: 26.2708, lng: 50.6336, utc: 3 },
  { code: 'KWI', city: 'Kuwait City', name: 'Kuwait International Airport', country: 'Kuwait', cc: 'KW', lat: 29.2266, lng: 47.9689, utc: 3 },
  { code: 'NBO', city: 'Nairobi', name: 'Jomo Kenyatta International Airport', country: 'Kenya', cc: 'KE', lat: -1.3192, lng: 36.9278, utc: 3 },
  { code: 'GYD', city: 'Baku', name: 'Heydar Aliyev International Airport', country: 'Azerbaijan', cc: 'AZ', lat: 40.4675, lng: 50.0467, utc: 4 },
  { code: 'TAS', city: 'Tashkent', name: 'Islam Karimov Tashkent Airport', country: 'Uzbekistan', cc: 'UZ', lat: 41.2579, lng: 69.2812, utc: 5 },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj Airport', country: 'India', cc: 'IN', lat: 19.0896, lng: 72.8656, utc: 5.5 },
  { code: 'CMB', city: 'Colombo', name: 'Bandaranaike International Airport', country: 'Sri Lanka', cc: 'LK', lat: 7.1808, lng: 79.8841, utc: 5.5 },
  { code: 'KTM', city: 'Kathmandu', name: 'Tribhuvan International Airport', country: 'Nepal', cc: 'NP', lat: 27.6966, lng: 85.3591, utc: 5.75 },
  { code: 'DAC', city: 'Dhaka', name: 'Hazrat Shahjalal International Airport', country: 'Bangladesh', cc: 'BD', lat: 23.8433, lng: 90.3978, utc: 6 },
  { code: 'MAD', city: 'Madrid', name: 'Adolfo Suárez Madrid–Barajas Airport', country: 'Spain', cc: 'ES', lat: 40.4983, lng: -3.5676, utc: 1 },
  { code: 'FCO', city: 'Rome', name: 'Leonardo da Vinci–Fiumicino Airport', country: 'Italy', cc: 'IT', lat: 41.8003, lng: 12.2389, utc: 1 },
  { code: 'ZRH', city: 'Zurich', name: 'Zurich Airport', country: 'Switzerland', cc: 'CH', lat: 47.4647, lng: 8.5492, utc: 1 },
  { code: 'ORD', city: 'Chicago', name: "O'Hare International Airport", country: 'United States', cc: 'US', lat: 41.9742, lng: -87.9073, utc: -6 },
  { code: 'MEL', city: 'Melbourne', name: 'Melbourne Airport', country: 'Australia', cc: 'AU', lat: -37.669, lng: 144.841, utc: 10 },
];

const BY_CODE = Object.fromEntries(AIRPORTS.map((a) => [a.code, a]));

export const getAirport = (code) => BY_CODE[code];

// Country code -> flag emoji (e.g. "PK" -> 🇵🇰)
export const flagEmoji = (cc) =>
  cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

// Matches airport code, city, airport name or country (used by the autocomplete).
export function searchAirports(query, limit = 100) {
  const q = query.trim().toLowerCase();
  if (!q) return [...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city)).slice(0, limit);
  return AIRPORTS.map((a) => {
    let score = 0;
    if (a.code.toLowerCase() === q) score = 100;
    else if (a.city.toLowerCase().startsWith(q)) score = 80;
    else if (a.code.toLowerCase().startsWith(q)) score = 70;
    else if (a.name.toLowerCase().includes(q)) score = 50;
    else if (a.country.toLowerCase().startsWith(q)) score = 40;
    else if (a.city.toLowerCase().includes(q)) score = 30;
    return { a, score };
  })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a);
}
