# AeroLink – Flight Management Platform

A frontend-only flight search and booking platform built for the WebEra Solutions frontend internship.
Users can search flights, compare options, pick seats, book, pay (simulated), get a boarding pass and manage their trips.

**Live demo:** https://YOUR-APP.vercel.app
**Demo video:** PASTE-DRIVE-OR-YOUTUBE-LINK-HERE

## Screenshots
| | |
|---|---|
| ![Home](docs/screenshots/01-home.png) | ![Results](docs/screenshots/02-results.png) |
| ![Compare](docs/screenshots/03-compare.png) | ![Seats](docs/screenshots/04-seats.png) |
| ![Payment](docs/screenshots/05-payment.png) | ![Boarding pass](docs/screenshots/06-boarding-pass.png) |
| ![My trips](docs/screenshots/07-my-trips.png) | ![Mobile](docs/screenshots/08-mobile.png) |

## Features
**Search**
- One way, round trip and multi-city (up to 4 flights)
- Airport autocomplete (code, city, airport name or country) with flags
- Price calendar: cheapest days of the month, one tap to set the date
- Adults / children / infants (infants cannot exceed adults) and cabin class
- Animated route map in the hero

**Results**
- URL-based search state (refresh keeps your search), nearby-date strip and a price trend chart
- Best / Cheapest / Fastest sorting
- Filters: price, stops, airline, departure time, duration, one-click reset
- Flight details with layovers, aircraft, baggage and amenities

**Compare**
- Up to 3 flights side by side, best value highlighted, sticky Compare button

**Seats**
- Seat map with fees for extra legroom and exit rows, one seat per passenger
- 10-minute seat hold timer

**Booking**
- Passenger forms with validation, add-ons (baggage, meal, priority boarding)
- Payment simulation: Card (validated), Wallet, or Pay later (reserved for 24 hours, auto-cancelled if unpaid)

**Confirmation**
- Boarding pass with QR code, flip animation, image download, calendar file (.ics) and print / PDF

**My trips**
- Next-trip countdown, stats (trips, spend, distance, countries, favourite destination), route map, spending chart, weather estimate
- Upcoming / Past / Cancelled tabs
- Manage booking: edit names, change seats on a seat map for every flight, baggage, meal, priority. Name change $25, seat change $10 each, extra charges are paid, reductions are refunded, changes close 24 hours before departure
- Cancel with a refund policy: 7+ days 100%, 1–7 days 50%, under 24 hours none

**General:** dark / light theme, responsive layout, keyboard-friendly forms, error boundary.

## Tech stack
React 19, Vite, React Router, Tailwind CSS v4, Zustand (with persist), qrcode.react, html-to-image.

## How it works
**Deterministic flight generator** (`src/data/generator.js`): there is no backend or API. Flights are generated from a seed made of route + date, so the same search always returns the same flights, while any other route or date gives a new, realistic set (legs, layovers at sensible hubs, time-zone-correct arrival times, baggage, amenities, prices). The price calendar and the price trend use the same generator, so prices match across screens.

**State:** one Zustand store (`src/store.js`) keeps the search, the selected flights, seats, passengers, add-ons and bookings. Bookings are saved in the browser's LocalStorage.

```
src/
  App.jsx          layout, theme toggle, routes
  pages.jsx        all pages and components
  store.js         state, pricing and booking logic
  data/            airports, airlines, aircraft, flight generator
  index.css        theme tokens, animations, print styles
scripts/
  smoke.mjs        renders every page with sample data
  preview.mjs      prints the demo search
```

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
node scripts/smoke.mjs
```

## Deploy
Vercel: import the repo, framework "Vite", build `npm run build`, output `dist` (`vercel.json` handles page refreshes).
Netlify: build `npm run build`, publish `dist` (`public/_redirects` is included).

## Notes
- Frontend-only project: airlines, schedules and prices are generated sample data, not real inventory.
- Payments are simulated, no real charge is made. Bookings live in the browser (LocalStorage), so another browser or device starts empty.

Built by Muhammad Faiz Alam.
