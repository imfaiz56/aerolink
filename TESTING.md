# AeroLink – manual test checklist

Run `npm install` then `npm run dev`, open http://localhost:5173

## Home
- [ ] Hero animates; airport autocomplete works (type "isl", arrow keys, Enter)
- [ ] One way / Round trip / Multi-city toggle; multi-city: add/remove flights
- [ ] Price calendar: change month, tap a day, cheapest day is green
- [ ] Passenger counters (infants cannot exceed adults), cabin class, Swap button

## Results
- [ ] Date strip, price trend chart, Best/Cheapest/Fastest tabs
- [ ] Filters: price, stops, airline, departure time, duration, Reset filters
- [ ] "Flight details" expands (legs, layover); Compare up to 3 flights
- [ ] Round trip / multi-city: you are asked to choose every flight in order

## Compare
- [ ] Table opens with 2-3 flights, best values in green, Select/Remove work

## Seats
- [ ] Seat per passenger, fees for extra legroom/exit rows, taken seats disabled
- [ ] 10 minute hold timer counts down

## Passengers / Payment
- [ ] Validation messages for empty/invalid fields
- [ ] Add-ons change total; card validation (4242 4242 4242 4242, 12/28, 123); Wallet / Pay later

## Confirmation
- [ ] Confetti, boarding pass, "View details" flip, QR, Download image, Add to calendar, Print/PDF
- [ ] Extra flights (return / multi-city) listed with seats

## My trips
- [ ] Next-trip countdown, stats, route map, weather estimate, spending bars
- [ ] Upcoming / Past / Cancelled tabs; Manage (names, seat, baggage, meal) updates total; Cancel booking
- [ ] Refresh the page: bookings are still there (LocalStorage)

## Other
- [ ] Dark/light toggle, mobile layout (F12 > phone icon, 390px), 404 page, `npm run build` succeeds
