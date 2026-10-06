import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getAirport } from './data/airports.js'
import { DEMO_SEARCH, totalPrice, createRng } from './data/generator.js'

const ALL = []
for (let i = 1; i <= 24; i++) for (const c of 'ABCDEF') ALL.push(i + c)
export const takenSeats = (f) => { const t = new Set(); const r = createRng(f.id + 'seats'); for (const id of ALL) if (r.chance(0.35)) t.add(id); return t }
export const planOf = (s) => {
  const one = [{ from: s.from, to: s.to, date: s.depart }]
  if (s.trip === 'round') return [one[0], { from: s.to, to: s.from, date: s.ret }]
  if (s.trip !== 'multi' || !s.legs) return one
  const L = s.legs.split(',').map((x) => { const [from, to, y, m, d] = x.split('-'); return { from, to, date: y && m && d ? `${y}-${m}-${d}` : '' } }).filter((l) => getAirport(l.from) && getAirport(l.to))
  return L.length ? L : one
}
export const seatFee = (id) => { const r = parseInt(id); return r <= 3 ? 28 : r === 12 || r === 13 ? 18 : 0 }

export const addonFee = (a, n) => (({ 0: 0, 10: 25, 20: 45 })[a.bag] || 0) * n + (a.priority ? 15 * n : 0)
const ADDONS = { bag: 0, meal: 'Standard', priority: false }
export const calcTotal = (b) => totalPrice(b.flight, b.search) + (b.extra || []).reduce((t, f) => t + totalPrice(f, b.search), 0) + b.seats.reduce((t, id) => t + (id ? seatFee(id) : 0), 0) + addonFee(b.addons || ADDONS, b.search.adults + b.search.children) + (b.fees || 0)

export const useStore = create(persist((set, get) => ({
  search: (({ return: r, ...d }) => ({ ...d, trip: 'round', ret: r }))(DEMO_SEARCH),
  extra: [], addLeg: (f) => set({ extra: [...get().extra, f], compare: [] }),
  updateBooking: (ref, patch) => set({ bookings: get().bookings.map((b) => (b.ref === ref ? { ...b, ...patch } : b)) }),
  setSearch: (p) => set({ search: { ...get().search, ...p } }),
  flight: null,
  setFlight: (flight) => set({ flight, extra: [], compare: [], seats: [], passengers: [], holdUntil: null, addons: { ...ADDONS } }),
  holdUntil: null,
  startHold: () => { if (!get().holdUntil) set({ holdUntil: Date.now() + 600000 }) },
  clearHold: () => set({ holdUntil: null, seats: [] }),
  addons: { ...ADDONS }, setAddons: (addons) => set({ addons }),
  contact: null, setContact: (contact) => set({ contact }),
  compare: [],
  toggleCompare: (f) => { const c = get().compare; set({ compare: c.some((x) => x.id === f.id) ? c.filter((x) => x.id !== f.id) : c.length < 3 ? [...c, f] : c }) },
  seats: [],
  setSeats: (seats) => set({ seats }),
  passengers: [],
  setPassengers: (passengers) => set({ passengers }),
  bookings: [],
  confirm: (method = 'card') => {
    const { flight, extra, seats, search, bookings, passengers, contact, addons } = get()
    const ref = 'AL' + Math.floor(10000 + Math.random() * 89999)
    const extraSeats = extra.map((f) => { const t = takenSeats(f); const used = new Set(); return seats.map((id) => { let pick = id; if (t.has(pick) || used.has(pick)) pick = ALL.find((x) => !t.has(x) && !used.has(x)); used.add(pick); return pick }) })
    const nb = { ref, flight, extra, extraSeats, seats, passengers, contact, search, addons, total: 0, status: 'upcoming', payStatus: method === 'later' ? 'unpaid' : 'paid', payDue: method === 'later' ? Date.now() + 864e5 : null }
    nb.total = calcTotal(nb)
    set({ bookings: [nb, ...bookings], extra: [], compare: [], flight: null, seats: [], passengers: [], holdUntil: null, addons: { ...ADDONS } })
    return ref
  },
  payBooking: (ref) => set({ bookings: get().bookings.map((b) => (b.ref === ref ? { ...b, payStatus: 'paid', payDue: null } : b)) }),
  expireUnpaid: () => {
    const now = Date.now(); const late = (b) => b.status === 'upcoming' && b.payStatus === 'unpaid' && b.payDue < now
    if (get().bookings.some(late)) set({ bookings: get().bookings.map((b) => (late(b) ? { ...b, status: 'cancelled', refund: 0, expired: true } : b)) })
  },
  cancel: (ref) => set({ bookings: get().bookings.map((b) => (b.ref === ref ? { ...b, status: 'cancelled' } : b)) }),
}), { name: 'aerolink' }))