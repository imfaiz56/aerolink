// Render check: node scripts/smoke.mjs  (renders every page with sample data and reports errors)
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
const mem = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) } })
globalThis.window = { scrollTo() {}, localStorage: globalThis.localStorage }
const v = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { default: App } = await v.ssrLoadModule('/src/App.jsx')
const { Manage } = await v.ssrLoadModule('/src/pages.jsx')
const { useStore } = await v.ssrLoadModule('/src/store.js')
const { generateFlights } = await v.ssrLoadModule('/src/data/generator.js')
React.useSyncExternalStore = (sub, getSnap) => getSnap() // server render would otherwise show the empty initial store
let bad = 0
const show = (url, el) => { try { const h = renderToString(React.createElement(MemoryRouter, { initialEntries: [url] }, el || React.createElement(App))); console.log('OK  ', url, h.length) } catch (e) { bad++; console.log('FAIL', url, e.message) } }
const st = () => useStore.getState()
const legs = 'ISB-DXB-2026-10-18,DXB-IST-2026-10-22,IST-LHR-2026-10-26'
const base = { ...st().search, adults: 2, trip: 'multi', legs, from: 'ISB', to: 'DXB', depart: '2026-10-18' }
const q = new URLSearchParams(base).toString()
st().setSearch(base)
show('/'); for (const l of [0, 1, 2]) show(`/results?${q}&leg=${l}`)
for (const t of ['oneway', 'round']) show(`/results?${new URLSearchParams({ ...base, trip: t, ret: '2026-10-25' })}`)
const f = [['ISB', 'DXB', '2026-10-18'], ['DXB', 'IST', '2026-10-22'], ['IST', 'LHR', '2026-10-26']].map(([from, to, date]) => generateFlights({ from, to, date })[0])
st().setFlight(f[0]); st().addLeg(f[1]); st().addLeg(f[2])
st().toggleCompare(generateFlights({ from: 'ISB', to: 'DXB', date: '2026-10-18' })[1]); st().toggleCompare(f[0]); show('/compare')
st().setSeats(['1A', '1B']); st().setPassengers([{ first: 'A', last: 'B', dob: '1990-01-01', passport: 'AB123456' }, { first: 'C', last: 'D', dob: '1991-01-01', passport: 'AB123457' }]); st().setContact({ email: 'a@b.co', phone: '+92 300 0000000' })
for (const u of ['/seats', '/passengers', '/payment']) show(u)
const ref = st().confirm(); const b = st().bookings[0]
console.log('booking', ref, b.extra.length + 1, 'flights, extraSeats', JSON.stringify(b.extraSeats), 'total', b.total)
show('/confirmation/' + ref); show('/dashboard'); show('/x', React.createElement(Manage, { b, updateBooking() {} }))
await v.close(); console.log(bad ? bad + ' FAILED' : 'ALL PAGES RENDER'); process.exit(bad ? 1 : 0)
