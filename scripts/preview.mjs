// Run: node scripts/preview.mjs   (prints the demo search so you can check the data)
import { generateFlights, sortFlights, formatDuration, DEMO_SEARCH, getPriceTrend } from '../src/data/generator.js';

const flights = sortFlights(generateFlights({ from: DEMO_SEARCH.from, to: DEMO_SEARCH.to, date: DEMO_SEARCH.depart, cabin: DEMO_SEARCH.cabin }), 'best');
console.log(`${DEMO_SEARCH.from} -> ${DEMO_SEARCH.to}  ${DEMO_SEARCH.depart}  (${flights.length} flights)\n`);
for (const f of flights) {
  const plus = f.arriveDayOffset ? ` +${f.arriveDayOffset}` : '';
  const via = f.stops ? ` via ${f.stopCodes.join(',')}` : '';
  console.log(`${f.airline.padEnd(18)} ${f.flightNumber.padEnd(7)} ${f.departTime} -> ${f.arriveTime}${plus}  ${formatDuration(f.durationMin).padEnd(8)} ${f.stops === 0 ? 'Nonstop' : f.stops + ' stop' + via}  $${f.pricePerAdult}  ${f.aircraft}`);
}
const { cheapest } = getPriceTrend({ from: DEMO_SEARCH.from, to: DEMO_SEARCH.to, date: DEMO_SEARCH.depart });
console.log(`\nCheapest day around ${DEMO_SEARCH.depart}: ${cheapest.date} from $${cheapest.price}`);
