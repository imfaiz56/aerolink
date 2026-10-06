import { AIRPORTS, getAirport } from './airports.js';
import { AIRLINES, getAirline } from './airlines.js';
import { AIRCRAFT } from './aircraft.js';

/* ---------------- seeded random (same seed = same results) ---------------- */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed) {
  const next = mulberry32(xmur3(seed)());
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

/* ---------------- helpers ---------------- */
export const CABINS = {
  economy: { label: 'Economy', multiplier: 1 },
  premium: { label: 'Premium Economy', multiplier: 1.7 },
  business: { label: 'Business', multiplier: 3 },
  first: { label: 'First', multiplier: 5 },
};

export function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Dates are plain "YYYY-MM-DD" strings so time zones never shift the day.
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const dayOfWeek = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

// minutes since midnight -> { time: "08:30", dayOffset: 0 | 1 | -1 ... }
function toClock(totalMinutes) {
  const dayOffset = Math.floor(totalMinutes / 1440);
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return { time: `${hh}:${mm}`, dayOffset };
}

export const formatDuration = (min) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

const HUBS = AIRPORTS.filter((a) => a.hub).map((a) => a.code);

// Same route + date always gives the same price level, so the calendar and the results agree.
function dateFactor(from, to, date) {
  const rng = createRng(`${from}-${to}-${date}-price`);
  let f = 0.82 + rng.next() * 0.5;
  const dow = dayOfWeek(date);
  if (dow === 5 || dow === 0) f *= 1.08; // Fri, Sun
  if (dow === 2 || dow === 3) f *= 0.93; // Tue, Wed
  return f;
}

function pickStops(rng, km) {
  if (km < 1800) return rng.chance(0.95) ? 0 : 1;
  if (km < 5000) return rng.chance(0.75) ? 0 : 1;
  if (km < 9000) return rng.chance(0.45) ? 0 : 1;
  return rng.chance(0.3) ? 0 : rng.chance(0.8) ? 1 : 2;
}

function pickAirline(rng, km, stops) {
  const pool = AIRLINES.filter((a) => a.type !== 'budget' || (stops === 0 && km < 5500));
  return rng.pick(pool);
}

/* ---------------- flight generation ---------------- */
export function generateFlights({ from, to, date, cabin = 'economy' }) {
  const A = getAirport(from);
  const B = getAirport(to);
  if (!A || !B || from === to) return [];

  const rng = createRng(`${from}-${to}-${date}`);
  const km = distanceKm(A, B);
  const factor = dateFactor(from, to, date);
  const cabinMul = CABINS[cabin]?.multiplier ?? 1;
  const count = rng.int(10, 16);
  const flights = [];

  for (let i = 0; i < count; i++) {
    // Always include one nonstop (when realistic) and one cheaper connection.
    let wantedStops = pickStops(rng, km);
    if (i === 0 && km < 7000) wantedStops = 0;
    if (i === 1 && km > 2500) wantedStops = 1;

    // Route through hubs, but only hubs that do not make a silly detour.
    const stopCodes = [];
    let attempts = 0;
    while (stopCodes.length < wantedStops && attempts++ < 30) {
      const h = rng.pick(HUBS);
      if (h === from || h === to || stopCodes.includes(h)) continue;
      const codes = [from, ...stopCodes, h, to].map(getAirport);
      const len = codes.slice(1).reduce((s, p, idx) => s + distanceKm(codes[idx], p), 0);
      if (len <= km * 1.35 + 500) stopCodes.push(h);
    }
    const stops = stopCodes.length;

    // One budget carrier on short nonstop routes so the results look varied.
    const airline =
      i === 2 && stops === 0 && km < 5500
        ? rng.pick(AIRLINES.filter((a) => a.type === 'budget'))
        : pickAirline(rng, km, stops);

    const path = [A, ...stopCodes.map(getAirport), B];
    const legKm = path.slice(1).map((p, idx) => distanceKm(path[idx], p));
    const pathKm = legKm.reduce((s, x) => s + x, 0);

    const isWide = Math.max(...legKm) > 4500 && airline.type !== 'budget';
    const aircraft = rng.pick(isWide ? AIRCRAFT.wide : AIRCRAFT.narrow);

    // Build legs with real local times
    const depMinLocal = rng.int(60, 276) * 5; // 05:00 - 23:00
    let clockUtc = depMinLocal - A.utc * 60;
    const baseFlightNo = rng.int(100, 899);
    const legs = [];
    let totalMin = 0;
    path.slice(1).forEach((dest, idx) => {
      const origin = path[idx];
      const legMin = Math.round((legKm[idx] / aircraft.speed) * 60 + 28);
      const dep = toClock(clockUtc + origin.utc * 60);
      const arr = toClock(clockUtc + legMin + dest.utc * 60);
      legs.push({
        from: origin.code,
        to: dest.code,
        flightNumber: `${airline.code}${baseFlightNo + idx}`,
        departTime: dep.time,
        departDayOffset: dep.dayOffset,
        arriveTime: arr.time,
        arriveDayOffset: arr.dayOffset,
        durationMin: legMin,
      });
      totalMin += legMin;
      clockUtc += legMin;
      if (idx < path.length - 2) {
        const layover = rng.int(55, 190);
        legs[legs.length - 1].layoverAfterMin = layover;
        totalMin += layover;
        clockUtc += layover;
      }
    });

    const first = legs[0];
    const last = legs[legs.length - 1];

    // Price per adult
    const price = Math.round(
      (45 + km * 0.085) * airline.priceLevel * factor * (1 - 0.06 * stops) * (0.92 + rng.next() * 0.2) * cabinMul
    );

    // Baggage and amenities from airline type
    const checkedBase = airline.type === 'budget' ? 15 : airline.type === 'full' ? 23 : 30;
    const checkedBonus = { economy: 0, premium: 5, business: 15, first: 25 }[cabin] ?? 0;
    const wifiChance = { budget: 0.1, full: 0.5, premium: 0.85 }[airline.type];

    flights.push({
      id: `${from}-${to}-${date}-${i}`,
      airlineCode: airline.code,
      airline: airline.name,
      flightNumber: first.flightNumber,
      from,
      to,
      date,
      cabin,
      aircraft: aircraft.name,
      stops,
      stopCodes,
      legs,
      departTime: first.departTime,
      arriveTime: last.arriveTime,
      arriveDayOffset: last.arriveDayOffset, // 0 = same day, 1 = +1 day
      durationMin: totalMin,
      distanceKm: km,
      pricePerAdult: price,
      currency: 'USD',
      baggage: { cabin: 7, checked: checkedBase + checkedBonus },
      amenities: {
        meal: airline.type !== 'budget',
        entertainment: airline.type !== 'budget',
        wifi: rng.chance(wifiChance),
      },
      seatsLeft: rng.int(2, 42),
    });
  }

  return flights.sort((a, b) => a.departTime.localeCompare(b.departTime));
}

/* ---------------- pricing, sorting, calendar ---------------- */
// Children pay 75%, infants 10%.
export function totalPrice(flight, { adults = 1, children = 0, infants = 0 } = {}) {
  return Math.round(flight.pricePerAdult * (adults + children * 0.75 + infants * 0.1));
}

export function sortFlights(flights, mode = 'best') {
  const list = [...flights];
  if (mode === 'cheapest') return list.sort((a, b) => a.pricePerAdult - b.pricePerAdult || a.durationMin - b.durationMin);
  if (mode === 'fastest') return list.sort((a, b) => a.durationMin - b.durationMin || a.pricePerAdult - b.pricePerAdult);
  // best = balance of price, duration and stops (lower score is better)
  const minP = Math.min(...list.map((f) => f.pricePerAdult));
  const maxP = Math.max(...list.map((f) => f.pricePerAdult));
  const minD = Math.min(...list.map((f) => f.durationMin));
  const maxD = Math.max(...list.map((f) => f.durationMin));
  const norm = (v, lo, hi) => (hi === lo ? 0 : (v - lo) / (hi - lo));
  const score = (f) =>
    0.5 * norm(f.pricePerAdult, minP, maxP) + 0.35 * norm(f.durationMin, minD, maxD) + 0.15 * (f.stops / 2);
  return list.sort((a, b) => score(a) - score(b));
}

const cache = new Map();
export function cheapestForDay({ from, to, date, cabin = 'economy' }) {
  const key = `${from}-${to}-${date}-${cabin}`;
  if (!cache.has(key)) {
    const prices = generateFlights({ from, to, date, cabin }).map((f) => f.pricePerAdult);
    cache.set(key, prices.length ? Math.min(...prices) : null);
  }
  return cache.get(key);
}

// For the price calendar: [{ date, price, isCheapest }]
export function getPriceCalendar({ from, to, startDate, days = 42, cabin = 'economy' }) {
  const list = Array.from({ length: days }, (_, i) => {
    const date = addDays(startDate, i);
    return { date, price: cheapestForDay({ from, to, date, cabin }) };
  });
  const min = Math.min(...list.map((d) => d.price));
  return list.map((d) => ({ ...d, isCheapest: d.price === min }));
}

// For the price trend chart: 7 days before and after the chosen date.
export function getPriceTrend({ from, to, date, cabin = 'economy', range = 7 }) {
  const points = getPriceCalendar({ from, to, startDate: addDays(date, -range), days: range * 2 + 1, cabin });
  const cheapest = points.reduce((a, b) => (b.price < a.price ? b : a));
  return { points, cheapest };
}

// Fixed search for recording the demo video.
export const DEMO_SEARCH = {
  from: 'ISB',
  to: 'DXB',
  depart: '2026-10-18',
  return: '2026-10-25',
  adults: 2,
  children: 0,
  infants: 0,
  cabin: 'economy',
};
