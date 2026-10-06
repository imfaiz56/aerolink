import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AIRPORTS, getAirport, searchAirports, flagEmoji } from './data/airports.js'
import { getAirline } from './data/airlines.js'
import { CABINS, generateFlights, sortFlights, totalPrice, formatDuration, getPriceCalendar, getPriceTrend, createRng, addDays, distanceKm } from './data/generator.js'
import { useStore, seatFee, addonFee, calcTotal, planOf, takenSeats } from './store.js'

const card = 'rounded-2xl border border-line bg-surface p-4'
const btn = 'rounded-xl px-4 py-2 font-semibold transition active:scale-95 disabled:opacity-40 '
const primary = btn + 'bg-sky-brand text-navy-950 hover:brightness-110'
const ghost = btn + 'border border-line hover:bg-surface-2'
const input = 'w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-ink'
const money = (n) => (n == null ? '–' : `$${n.toLocaleString()}`)
const paxOf = (s) => s.adults + s.children
const todOk = (t, k) => { const h = +t.slice(0, 2); return k === 'any' || (k === 'morning' ? h >= 5 && h < 12 : k === 'afternoon' ? h >= 12 && h < 17 : k === 'evening' ? h >= 17 && h < 21 : h >= 21 || h < 5) }
const durOk = (m, k) => k === 'any' || (k === 'short' ? m < 300 : k === 'mid' ? m >= 300 && m < 600 : m >= 600)
const withDate = (s, i, d) => s.trip === 'multi' ? { ...s, legs: planOf(s).map((l, k) => `${l.from}-${l.to}-${k === i ? d : l.date}`).join(',') } : i === 1 ? { ...s, ret: d } : { ...s, depart: d }
function useChoose() {
  const nav = useNavigate(); const { setFlight, addLeg, setSearch } = useStore()
  return (f, s) => {
    const plan = planOf(s); let i = plan.findIndex((l) => l.from === f.from && l.to === f.to); if (i < 0) i = 0
    if (i === 0) { setFlight(f); setSearch(s) } else addLeg(f)
    nav(i + 1 < plan.length ? '/results?' + new URLSearchParams({ ...s, leg: i + 1 }) : '/seats')
  }
}
const hoursLeft = (b) => (new Date(b.flight.date + 'T' + b.flight.departTime + ':00') - new Date()) / 36e5
const refundPct = (b) => { const h = hoursLeft(b); return h > 168 ? 1 : h > 24 ? 0.5 : 0 }
const refundOf = (b) => (b.payStatus === 'unpaid' ? 0 : Math.round(calcTotal(b) * refundPct(b)))
const lastOf = (b) => (b.extra?.length ? b.extra[b.extra.length - 1] : b.flight)
const pathOf = (b) => [b.flight, ...(b.extra || [])].map((x) => x.from).concat(lastOf(b).to).join(' → ')
const readSearch = (sp) => ({ legs: sp.get('legs') || '', trip: sp.get('trip') || 'oneway', ret: sp.get('ret') || '', from: sp.get('from') || 'ISB', to: sp.get('to') || 'DXB', depart: sp.get('depart') || '2026-10-18', adults: +(sp.get('adults') || 1), children: +(sp.get('children') || 0), infants: +(sp.get('infants') || 0), cabin: sp.get('cabin') || 'economy' })
const nice = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function Empty({ text, to, label = 'Go to search' }) {
  return <div className={card + ' mx-auto max-w-md text-center'}><p className="text-muted">{text}</p><Link to={to} className={primary + ' mt-4 inline-block'}>{label}</Link></div>
}

function Hold() {
  const { holdUntil, clearHold } = useStore(); const nav = useNavigate(); const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (holdUntil && now >= holdUntil) { clearHold(); alert('Seat hold expired. Please select your seats again.'); nav('/seats') } }, [now])
  if (!holdUntil) return null
  const left = Math.max(0, Math.floor((holdUntil - now) / 1000))
  return <div role="timer" className="mb-4 rounded-xl border border-amber-brand px-4 py-2 text-sm text-amber-brand">Seats held for <b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b>. Complete your booking before time runs out.</div>
}

function Trend({ s }) {
  const { points, cheapest } = getPriceTrend({ from: s.from, to: s.to, date: s.depart, cabin: s.cabin })
  const lo = Math.min(...points.map((p) => p.price)), hi = Math.max(...points.map((p) => p.price)); const W = 300, H = 70
  const xy = (p, i) => [i * (W / (points.length - 1)), H - 8 - ((p.price - lo) / (hi - lo || 1)) * (H - 20)]
  return (
    <div className={card + ' mb-4'}>
      <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><b>Price trend (±7 days)</b><span className="text-success">Lowest: {nice(cheapest.date)} · {money(cheapest.price)}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full" role="img" aria-label="Price trend chart"><polyline points={points.map((p, i) => xy(p, i).join(',')).join(' ')} fill="none" stroke="#10b981" strokeWidth="2" />
        {points.map((p, i) => { const [x, y] = xy(p, i); return <circle key={p.date} cx={x} cy={y} r={p.date === cheapest.date ? 4 : 2.5} fill={p.date === cheapest.date ? '#22c55e' : p.date === s.depart ? '#f59e0b' : '#10b981'} /> })}</svg>
    </div>)
}

function RouteMap({ routes = [], plane = false, className = '' }) {
  const W = 800, H = 400
  const P = (c) => { const a = getAirport(c); return [((a.lng + 180) / 360) * W, ((90 - a.lat) / 180) * H] }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Route map">
      {AIRPORTS.map((a) => { const [x, y] = P(a.code); return <circle key={a.code} cx={x} cy={y} r="2.5" fill="currentColor" opacity=".35" /> })}
      {routes.map((r, i) => {
        const [x1, y1] = P(r.from), [x2, y2] = P(r.to)
        const d = `M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.min(y1, y2) - Math.abs(x2 - x1) / 4 - 20} ${x2} ${y2}`
        return <g key={i}><path id={'rt' + i} d={d} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="6 6" /><circle cx={x1} cy={y1} r="5" fill="#10b981" /><circle cx={x2} cy={y2} r="5" fill="#f59e0b" />
          {plane && i === 0 && <text fontSize="26" fill="currentColor"><animateMotion dur="6s" repeatCount="indefinite" rotate="auto"><mpath href={'#rt' + i} /></animateMotion>✈</text>}</g>
      })}
    </svg>)
}

function AirportInput({ label, value, onChange }) {
  const a = getAirport(value) || AIRPORTS[0]; const [q, setQ] = useState(null); const [hi, setHi] = useState(0)
  const opts = q === null ? [] : searchAirports(q)
  const pick = (c) => { onChange(c); setQ(null) }
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((hi + 1) % Math.max(opts.length, 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((hi - 1 + opts.length) % Math.max(opts.length, 1)) }
    else if (e.key === 'Enter' && opts[hi]) { e.preventDefault(); pick(opts[hi].code) }
    else if (e.key === 'Escape') setQ(null)
  }
  return (
    <div className="relative">
      <label className="block text-sm text-muted">{label}
        <input role="combobox" aria-expanded={q !== null} aria-controls={'lb-' + label} autoComplete="off" className={input + ' mt-1'} value={q ?? `${a.city} (${a.code})`}
          onFocus={(e) => { setQ(''); e.target.select() }} onChange={(e) => { setQ(e.target.value); setHi(0) }} onBlur={() => setTimeout(() => setQ(null), 150)} onKeyDown={key} /></label>
      {opts.length > 0 && <ul id={'lb-' + label} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-surface shadow-xl">
        {opts.map((o, i) => <li key={o.code} role="option" aria-selected={i === hi} onMouseDown={() => pick(o.code)} className={'cursor-pointer px-3 py-2 text-sm ' + (i === hi ? 'bg-surface-2' : '')}>{flagEmoji(o.cc)} <b>{o.city}</b> <span className="text-muted">{o.code} · {o.name}</span></li>)}
      </ul>}
    </div>)
}

function PriceCalendar({ s, onPick }) {
  const [m, setM] = useState(s.depart.slice(0, 7)); const today = new Date().toISOString().slice(0, 10)
  const [y, mo] = m.split('-').map(Number); const count = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  const lead = (new Date(m + '-01T00:00:00Z').getUTCDay() + 6) % 7
  if (s.from === s.to) return <section className={card + ' mx-auto mt-6 max-w-4xl text-center text-sm text-muted'}>Choose two different airports to see the cheapest days.</section>
  const days = getPriceCalendar({ from: s.from, to: s.to, startDate: m + '-01', days: count, cabin: s.cabin })
  const prices = days.filter((d) => d.date >= today).map((d) => d.price); const min = Math.min(...prices)
  return (
    <section className={card + ' mx-auto mt-6 max-w-4xl'}>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Cheapest days · {getAirport(s.from).code} → {getAirport(s.to).code}</h2>
        <div className="flex items-center gap-2"><button type="button" aria-label="Previous month" className={ghost} onClick={() => setM(addDays(m + '-01', -1).slice(0, 7))}>‹</button>
          <b className="w-28 text-center text-sm">{new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b>
          <button type="button" aria-label="Next month" className={ghost} onClick={() => setM(addDays(m + '-01', 32).slice(0, 7))}>›</button></div></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">{Array.from({ length: lead }, (_, i) => <span key={'b' + i} />)}
        {days.map((d) => { const past = d.date < today; return (
          <button key={d.date} type="button" disabled={past} onClick={() => onPick(d.date)} className={'rounded-lg border p-1 text-xs transition disabled:opacity-30 ' + (d.date === s.depart ? 'border-sky-brand bg-surface-2' : 'border-line hover:bg-surface-2')}>
            <span className="block text-muted">{+d.date.slice(8)}</span><b className={d.price === min && !past ? 'text-success' : ''}>{money(d.price)}</b></button>) })}</div>
      <p className="mt-2 text-xs text-muted">Green = cheapest day this month. Tap a day to set your departure.</p>
    </section>)
}

/* ---------------- Home ---------------- */
export function Home() {
  const nav = useNavigate(); const { search, setSearch } = useStore(); const [s, setS] = useState(search)
  const set = (k, v) => setS({ ...s, [k]: v })
  const go = (e) => {
    e.preventDefault()
    if (s.from === s.to) return alert('Choose two different airports.')
    if (s.infants > s.adults) return alert('Each infant needs an adult. Add an adult or remove an infant.')
    if (s.trip === 'multi' && legs.some((l, i) => l.from === l.to || (i > 0 && l.date < legs[i - 1].date))) return alert('Check your legs: each needs two different airports and dates in order.')
    if (s.trip === 'round' && s.ret < s.depart) return alert('The return date must be on or after the departure date.')
    setSearch(s); nav('/results?' + new URLSearchParams(s))
  }
  const setTrip = (k) => setS({ ...s, trip: k, legs: k === 'multi' && s.trip !== 'multi' ? `${s.from}-${s.to}-${s.depart},${s.to}-${s.to === 'IST' ? 'LHR' : 'IST'}-${addDays(s.depart, 4)}` : s.legs })
  const legs = s.trip === 'multi' ? planOf(s) : []
  const upLegs = (L) => setS({ ...s, legs: L.map((l) => `${l.from}-${l.to}-${l.date}`).join(','), from: L[0].from, to: L[0].to, depart: L[0].date })
  const setLeg = (i, patch) => upLegs(legs.map((l, k) => { if (k !== i) return l; const n = { ...l, ...patch }; if (n.from === n.to) { if (patch.from) n.to = l.from; else if (patch.to) n.from = l.to } return n }))
  const change = (k, d) => {
    const n = { ...s, [k]: Math.min(9, Math.max(k === 'adults' ? 1 : 0, s[k] + d)) }
    if (n.infants > n.adults) n.infants = n.adults
    setS(n)
  }
  const Counter = ({ k, label, hint, min }) => (
    <div className="flex items-center justify-between"><span>{label}<small className="block text-xs text-muted">{hint}</small></span>
      <span className="flex items-center gap-3">
        <button type="button" aria-label={'Fewer ' + label} className={ghost} onClick={() => change(k, -1)}>−</button>
        <b className="w-4 text-center">{s[k]}</b>
        <button type="button" aria-label={'More ' + label} className={ghost} disabled={k === 'infants' && s.infants >= s.adults} onClick={() => change(k, 1)}>+</button>
      </span></div>)
  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-navy-900 to-navy-700 px-6 py-14 text-white sm:px-12">
        <RouteMap routes={[{ from: s.from, to: s.to }]} plane className="absolute inset-0 h-full w-full text-white opacity-60" />
        <div className="relative max-w-xl">
          <h1 className="text-4xl font-bold sm:text-5xl">Find the flight. Pick your seat. Go.</h1>
          <p className="mt-3 text-white/70">Search 30 airports, compare up to three flights and manage every booking in one place.</p>
        </div>
      </section>
      <form onSubmit={go} className={card + ' relative -mt-8 mx-auto grid max-w-4xl gap-4 shadow-xl sm:grid-cols-2'}>
        <div className="flex gap-2 sm:col-span-2" role="group" aria-label="Trip type">{[['oneway', 'One way'], ['round', 'Round trip'], ['multi', 'Multi-city']].map(([k, l]) => <button key={k} type="button" aria-pressed={s.trip === k} onClick={() => setTrip(k)} className={ghost + (s.trip === k ? ' !border-sky-brand text-sky-brand' : '')}>{l}</button>)}</div>
        {s.trip === 'multi' ? (
          <div className="space-y-3 sm:col-span-2">
            {legs.map((l, i) => <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_170px_auto]">
              <AirportInput label={`Flight ${i + 1} from`} value={l.from} onChange={(v) => setLeg(i, { from: v })} /><AirportInput label={`Flight ${i + 1} to`} value={l.to} onChange={(v) => setLeg(i, { to: v })} />
              <label className="block text-sm text-muted">Date<input type="date" required className={input + ' mt-1'} value={l.date} onChange={(e) => setLeg(i, { date: e.target.value })} /></label>
              {legs.length > 2 ? <button type="button" aria-label={`Remove flight ${i + 1}`} className={ghost} onClick={() => upLegs(legs.filter((_, k) => k !== i))}>✕</button> : <span />}</div>)}
            {legs.length < 4 && <button type="button" className={ghost} onClick={() => upLegs([...legs, { from: legs[legs.length - 1].to, to: legs[0].from, date: addDays(legs[legs.length - 1].date, 4) }])}>+ Add another flight</button>}
          </div>
        ) : (<>
        <AirportInput label="From" value={s.from} onChange={(v) => set('from', v)} /><AirportInput label="To" value={s.to} onChange={(v) => set('to', v)} />
        <label className="block text-sm text-muted">Departure date
          <input type="date" required className={input + ' mt-1'} value={s.depart} onChange={(e) => setS({ ...s, depart: e.target.value, ret: s.ret < e.target.value ? addDays(e.target.value, 7) : s.ret })} /></label>
        {s.trip === 'round' && <label className="block text-sm text-muted">Return date
          <input type="date" required min={s.depart} className={input + ' mt-1'} value={s.ret} onChange={(e) => set('ret', e.target.value)} /></label>}
        </>)}
        <label className="block text-sm text-muted">Cabin
          <select className={input + ' mt-1'} value={s.cabin} onChange={(e) => set('cabin', e.target.value)}>
            {Object.entries(CABINS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
          <Counter k="adults" label="Adults" hint="18+" min={1} /><Counter k="children" label="Children" hint="2–17" min={0} /><Counter k="infants" label="Infants" hint="Under 2" min={0} />
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button className={primary + ' flex-1'}>Search flights</button>
          <button type="button" className={ghost} onClick={() => setS({ ...s, from: s.to, to: s.from })}>⇄ Swap</button>
        </div>
      </form>
      <PriceCalendar s={s} onPick={(d) => setS({ ...s, depart: d, ret: s.ret < d ? addDays(d, 7) : s.ret })} />
    </div>
  )
}

function Details({ f }) {
  const [o, setO] = useState(false)
  return <div><button type="button" className="mt-1 text-xs text-sky-brand underline" aria-expanded={o} onClick={() => setO(!o)}>{o ? 'Hide details' : 'Flight details'}</button>
    {o && <div className="page mt-2 space-y-1 rounded-xl bg-surface-2 p-3 text-xs">{f.legs.map((l, i) => <div key={i}><b>{l.flightNumber}</b> {l.from} {l.departTime} → {l.to} {l.arriveTime}{l.arriveDayOffset > 0 ? ` +${l.arriveDayOffset}` : ''} · {formatDuration(l.durationMin)}{l.layoverAfterMin ? <div className="text-amber-brand">Layover in {l.to}: {formatDuration(l.layoverAfterMin)}</div> : null}</div>)}
      <div className="text-muted">Aircraft {f.aircraft} · Cabin bag {f.baggage.cabin} kg · Checked {f.baggage.checked} kg · Meal {f.amenities.meal ? 'included' : 'not included'} · Wi-Fi {f.amenities.wifi ? 'yes' : 'no'}</div></div>}</div>
}

/* ---------------- Results ---------------- */
export function Results() {
  const [sp, setSp] = useSearchParams()
  const s = readSearch(sp); const plan = planOf(s); const idx = Math.min(+(sp.get('leg') || 0), plan.length - 1); const cur = { ...s, from: plan[idx].from, to: plan[idx].to, depart: plan[idx].date }
  const nav = useNavigate()
  const { compare, toggleCompare } = useStore(); const choose = useChoose()
  const [sort, setSort] = useState('best'); const [maxP, setMaxP] = useState(99999); const [stops, setStops] = useState('any'); const [air, setAir] = useState('all'); const [tod, setTod] = useState('any'); const [dur, setDur] = useState('any')
  const reset = () => { setMaxP(99999); setStops('any'); setAir('all'); setTod('any'); setDur('any') }
  const all = useMemo(() => generateFlights({ from: cur.from, to: cur.to, date: cur.depart, cabin: cur.cabin }), [sp.toString()])
  const hi = Math.max(0, ...all.map((f) => f.pricePerAdult))
  const list = sortFlights(all.filter((f) => f.pricePerAdult <= maxP && (stops === 'any' || (stops === '0' ? f.stops === 0 : f.stops > 0)) && (air === 'all' || f.airlineCode === air) && todOk(f.departTime, tod) && durOk(f.durationMin, dur)), sort)
  const cal = getPriceCalendar({ from: cur.from, to: cur.to, startDate: addDays(cur.depart, -3), days: 7, cabin: s.cabin })
  const A = getAirport(cur.from), B = getAirport(cur.to)
  const pick = (f) => choose(f, s)
  const airlines = [...new Map(all.map((f) => [f.airlineCode, f.airline]))]
  return (
    <div>
      <div className="mb-4"><h1 className="text-2xl font-bold">{plan.length > 1 ? `Flight ${idx + 1} of ${plan.length}: ` : ''}{A?.city} → {B?.city}</h1>
        <p className="text-muted">{nice(cur.depart)} · {paxOf(s) + s.infants} traveler(s) · {CABINS[s.cabin]?.label} · {list.length} of {all.length} flights</p></div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Nearby dates">
        {cal.map((d) => (
          <button key={d.date} onClick={() => setSp(new URLSearchParams({ ...withDate(s, idx, d.date), leg: idx }))} className={'min-w-24 rounded-xl border px-3 py-2 text-left text-sm ' + (d.date === cur.depart ? 'border-sky-brand bg-surface-2' : 'border-line bg-surface')}>
            <span className="block text-muted">{nice(d.date).slice(0, 11)}</span><b className={d.isCheapest ? 'text-success' : ''}>{money(d.price)}</b></button>))}
      </div>
      <Trend s={cur} />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className={card + ' h-fit space-y-4'}>
          <label className="block text-sm">Max price: <b>{money(Math.min(maxP, hi))}</b>
            <input type="range" min="0" max={hi} value={Math.min(maxP, hi)} onChange={(e) => setMaxP(+e.target.value)} className="w-full accent-emerald-500" /></label>
          <label className="block text-sm text-muted">Stops<select className={input + ' mt-1'} value={stops} onChange={(e) => setStops(e.target.value)}><option value="any">Any</option><option value="0">Nonstop</option><option value="1">1+ stops</option></select></label>
          <label className="block text-sm text-muted">Airline<select className={input + ' mt-1'} value={air} onChange={(e) => setAir(e.target.value)}><option value="all">All airlines</option>{airlines.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
          <label className="block text-sm text-muted">Departure time<select className={input + ' mt-1'} value={tod} onChange={(e) => setTod(e.target.value)}><option value="any">Any time</option><option value="morning">Morning (5–12)</option><option value="afternoon">Afternoon (12–17)</option><option value="evening">Evening (17–21)</option><option value="night">Night (21–5)</option></select></label>
          <label className="block text-sm text-muted">Duration<select className={input + ' mt-1'} value={dur} onChange={(e) => setDur(e.target.value)}><option value="any">Any</option><option value="short">Under 5h</option><option value="mid">5–10h</option><option value="long">10h+</option></select></label>
          <button type="button" className={ghost + ' w-full'} onClick={reset}>Reset filters</button>
        </aside>
        <section className="space-y-3">
          <div className="sticky top-14 z-10 -mx-1 flex items-center gap-2 bg-bg/90 px-1 py-2 backdrop-blur" role="tablist">
            {[['best', 'Best'], ['cheapest', 'Cheapest'], ['fastest', 'Fastest']].map(([k, l]) => <button key={k} role="tab" aria-selected={sort === k} onClick={() => setSort(k)} className={ghost + (sort === k ? ' !border-sky-brand text-sky-brand' : '')}>{l}</button>)}
            {compare.length > 0 && <Link to="/compare" className={primary + ' ml-auto' + (compare.length < 2 ? ' pointer-events-none opacity-40' : '')}>Compare ({compare.length})</Link>}
          </div>
          {!list.length && <div className={card + ' text-center'}><p className="text-muted">No flights match these filters.</p><button className={primary + ' mt-3'} onClick={reset}>Reset filters</button></div>}
          {list.map((f, idx) => {
            const a = getAirline(f.airlineCode); const on = compare.some((c) => c.id === f.id)
            return (
              <article key={f.id} style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }} className={card + ' page grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center'}>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: a.color }}>{a.code}</span><b>{f.airline}</b><span className="text-muted">{f.flightNumber} · {f.aircraft}</span></div>
                  <div className="flex items-center gap-3">
                    <div><div className="font-display text-xl">{f.departTime}</div><div className="text-sm text-muted">{f.from}</div></div>
                    <div className="flex-1 text-center text-xs text-muted">{formatDuration(f.durationMin)}<div className="relative my-1 h-px bg-line"><span className="absolute left-1/2 -top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-sky-brand" /></div>{f.stops ? `${f.stops} stop · ${f.stopCodes.join(', ')}` : 'Nonstop'}</div>
                    <div className="text-right"><div className="font-display text-xl">{f.arriveTime}{f.arriveDayOffset > 0 && <sup className="text-xs text-amber-brand"> +{f.arriveDayOffset}</sup>}</div><div className="text-sm text-muted">{f.to}</div></div>
                  </div>
                  <div className="mt-2 text-xs text-muted">{f.baggage.checked} kg checked{f.amenities.meal ? ' · Meal' : ''}{f.amenities.wifi ? ' · Wi-Fi' : ''}{f.seatsLeft < 8 ? ` · Only ${f.seatsLeft} seats left` : ''}</div>
                  <Details f={f} />
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <div className="text-right"><div className="font-display text-2xl">{money(totalPrice(f, s))}</div><div className="text-xs text-muted">total, {paxOf(s) + s.infants} traveler(s)</div></div>
                  <div className="flex gap-2"><button className={ghost + (on ? ' !border-sky-brand text-sky-brand' : '')} onClick={() => toggleCompare(f)}>{on ? 'Added' : 'Compare'}</button><button className={primary} onClick={() => pick(f)}>Select</button></div>
                </div>
              </article>)
          })}
        </section>
      </div>
      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-sky-brand bg-surface/95 p-3 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><span className="text-sm">{compare.length}/3 flights: {compare.map((f) => f.flightNumber).join(', ')}</span>
            <Link to="/compare" className={primary + (compare.length < 2 ? ' pointer-events-none opacity-40' : '')}>Compare now</Link></div></div>)}
    </div>
  )
}

/* ---------------- Compare ---------------- */
export function Compare() {
  const { compare, toggleCompare, search: s } = useStore(); const choose = useChoose()
  const back = '/results?' + new URLSearchParams(s)
  if (compare.length < 1) return <Empty text="No flights to compare. Add flights from the results." to={back} label="Back to results" />
  const rows = [
    ['Price per adult', (f) => money(f.pricePerAdult), (f) => f.pricePerAdult, 1],
    ['Duration', (f) => formatDuration(f.durationMin), (f) => f.durationMin, 1],
    ['Stops', (f) => (f.stops ? `${f.stops} (${f.stopCodes.join(', ')})` : 'Nonstop'), (f) => f.stops, 1],
    ['Departs', (f) => f.departTime], ['Arrives', (f) => f.arriveTime + (f.arriveDayOffset > 0 ? ` +${f.arriveDayOffset}` : '')],
    ['Checked bag', (f) => f.baggage.checked + ' kg', (f) => f.baggage.checked, -1],
    ['Meal', (f) => (f.amenities.meal ? 'Included' : 'Not included')], ['Wi-Fi', (f) => (f.amenities.wifi ? 'Available' : 'No')], ['Aircraft', (f) => f.aircraft],
  ]
  return (
    <div><h1 className="mb-4 text-2xl font-bold">Compare flights</h1>
      <div className={card + ' overflow-x-auto !p-0'}>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead><tr className="border-b border-line"><th className="p-3" />{compare.map((f) => <th key={f.id} className="p-3"><div className="font-display text-base">{f.airline}</div><div className="font-normal text-muted">{f.flightNumber}</div></th>)}</tr></thead>
          <tbody>{rows.map(([l, show, val, dir]) => {
            const best = val ? (dir > 0 ? Math.min : Math.max)(...compare.map(val)) : null
            return <tr key={l} className="border-b border-line last:border-0"><td className="p-3 text-muted">{l}</td>{compare.map((f) => <td key={f.id} className={'p-3 ' + (val && compare.length > 1 && val(f) === best ? 'font-semibold text-success' : '')}>{show(f)}</td>)}</tr>
          })}
            <tr><td className="p-3" />{compare.map((f) => <td key={f.id} className="space-x-2 p-3"><button className={primary} onClick={() => choose(f, s)}>Select</button><button className={ghost} onClick={() => toggleCompare(f)}>Remove</button></td>)}</tr></tbody>
        </table></div>
      <p className="mt-3 text-sm text-muted">{compare.length > 1 ? 'Green marks the best value in each row (lowest price, shortest time, fewest stops, most baggage).' : 'Only one flight is left. Select it, or add more flights to compare.'}</p>
      {compare.length < 3 && <Link to={back} className={ghost + ' mt-3 inline-block'}>+ Add more flights</Link>}</div>
  )
}

/* ---------------- Seats ---------------- */
const COLS = ['A', 'B', 'C', 'D', 'E', 'F']; const ROWS = 24
export function Seats() {
  const { flight, extra, search: s, seats, setSeats, startHold } = useStore()
  const nav = useNavigate(); const [active, setActive] = useState(0)
  const pax = paxOf(s)
  const taken = useMemo(() => { const t = new Set(); if (!flight) return t; const r = createRng(flight.id + 'seats'); for (let i = 1; i <= ROWS; i++) for (const c of COLS) if (r.chance(0.35)) t.add(i + c); return t }, [flight])
  if (!flight) return <Empty text="Select a flight first." to="/results" label="Back to results" />
  const cur = Array.from({ length: pax }, (_, i) => seats[i] || null)
  const click = (id) => {
    if (taken.has(id)) return
    const n = cur.map((x) => (x === id ? null : x))
    if (cur[active] === id) return setSeats(n)
    n[active] = id; setSeats(n); startHold()
    const nx = n.findIndex((x) => !x); if (nx >= 0) setActive(nx)
  }
  const fees = cur.reduce((t, id) => t + (id ? seatFee(id) : 0), 0)
  const fare = totalPrice(flight, s) + extra.reduce((t, f) => t + totalPrice(f, s), 0)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className={card}>
        <h1 className="text-2xl font-bold">Choose your seats</h1>
        <Hold />
        <p className="mb-3 text-sm text-muted">{flight.airline} {flight.flightNumber} · {flight.aircraft}. Pick a passenger, then tap a seat.</p>
        <div className="mb-4 flex flex-wrap gap-2">{cur.map((id, i) => <button key={i} onClick={() => setActive(i)} className={ghost + (active === i ? ' !border-sky-brand text-sky-brand' : '')}>Passenger {i + 1}: {id || 'no seat'}</button>)}</div>
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted"><span>▢ Free</span><span className="text-amber-brand">▢ Extra legroom / exit row (fee)</span><span className="text-sky-brand">■ Yours</span><span>■ Taken</span></div>
        <div className="mx-auto w-fit rounded-t-[60px] border border-line bg-surface-2 px-6 pb-4 pt-10" role="group" aria-label="Seat map">
          <div className="mb-2 grid grid-cols-[28px_repeat(3,32px)_20px_repeat(3,32px)] gap-1 text-center text-xs text-muted"><span />{COLS.slice(0, 3).map((c) => <span key={c}>{c}</span>)}<span />{COLS.slice(3).map((c) => <span key={c}>{c}</span>)}</div>
          {Array.from({ length: ROWS }, (_, i) => i + 1).map((r) => (
            <div key={r} className={'mb-1 grid grid-cols-[28px_repeat(3,32px)_20px_repeat(3,32px)] items-center gap-1 ' + (r === 12 ? 'mt-4' : '')}>
              <span className="text-xs text-muted">{r}</span>
              {COLS.map((c, k) => {
                const id = r + c; const t = taken.has(id); const mine = cur.includes(id)
                return [k === 3 && <span key={'g' + r} />,
                  <button key={id} disabled={t} aria-label={`Seat ${id}${t ? ', taken' : seatFee(id) ? ', fee ' + money(seatFee(id)) : ''}`} onClick={() => click(id)}
                    className={'h-8 w-8 rounded-md text-xs font-semibold transition ' + (t ? 'bg-line opacity-40' : mine ? 'scale-110 bg-sky-brand text-navy-950' : seatFee(id) ? 'border border-amber-brand hover:bg-amber-brand/20' : 'border border-line hover:bg-surface')}>{c}</button>]
              })}
            </div>))}
        </div>
      </div>
      <aside className={card + ' h-fit space-y-2 lg:sticky lg:top-20'}>
        <h2 className="text-lg font-bold">Price</h2>
        <div className="flex justify-between text-sm"><span className="text-muted">Fare</span><span>{money(fare)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted">Seat fees</span><span>{money(fees)}</span></div>
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><span>Total</span><span>{money(fare + fees)}</span></div>
        <button className={primary + ' w-full'} disabled={cur.some((x) => !x)} onClick={() => nav('/passengers')}>Continue to passengers</button>
        {cur.some((x) => !x) && <p className="text-xs text-muted">Choose a seat for every passenger to continue.</p>}
      </aside>
    </div>
  )
}

/* ---------------- Passengers ---------------- */
function Field({ label, error, ...p }) {
  return <label className="block text-sm text-muted">{label}<input {...p} aria-invalid={!!error} className={input + ' mt-1 ' + (error ? '!border-danger' : '')} />{error && <span className="text-xs text-danger">{error}</span>}</label>
}
export function Passengers() {
  const { flight, search: s, seats, passengers, setPassengers, setContact } = useStore()
  const nav = useNavigate(); const pax = paxOf(s)
  const [f, setF] = useState(() => Array.from({ length: pax }, (_, i) => passengers[i] || { first: '', last: '', dob: '', passport: '' }))
  const [c, setC] = useState({ email: '', phone: '' }); const [err, setErr] = useState({})
  if (!flight || seats.filter(Boolean).length < pax) return <Empty text="Choose your seats first." to="/seats" label="Go to seats" />
  const upd = (i, k, v) => setF(f.map((p, j) => (j === i ? { ...p, [k]: v } : p)))
  const submit = (e) => {
    e.preventDefault(); const er = {}
    f.forEach((p, i) => {
      if (!p.first.trim()) er['first' + i] = 'Enter first name'
      if (!p.last.trim()) er['last' + i] = 'Enter last name'
      if (!p.dob) er['dob' + i] = 'Enter date of birth'
      if (!/^[A-Z0-9]{6,9}$/i.test(p.passport)) er['passport' + i] = 'Use 6–9 letters or numbers'
    })
    if (!/^\S+@\S+\.\S+$/.test(c.email)) er.email = 'Enter a valid email'
    if (!/^[+\d][\d\s-]{6,}$/.test(c.phone)) er.phone = 'Enter a valid phone number'
    setErr(er); if (Object.keys(er).length) return
    setPassengers(f); setContact(c); nav('/payment')
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4" noValidate>
      <h1 className="text-2xl font-bold">Passenger details</h1>
      <Hold />
      {f.map((p, i) => (
        <fieldset key={i} className={card + ' grid gap-3 sm:grid-cols-2'}><legend className="px-2 font-semibold">Passenger {i + 1} · Seat {seats[i]}</legend>
          <Field label="First name" value={p.first} onChange={(e) => upd(i, 'first', e.target.value)} error={err['first' + i]} />
          <Field label="Last name" value={p.last} onChange={(e) => upd(i, 'last', e.target.value)} error={err['last' + i]} />
          <Field label="Date of birth" type="date" value={p.dob} onChange={(e) => upd(i, 'dob', e.target.value)} error={err['dob' + i]} />
          <Field label="Passport number" value={p.passport} onChange={(e) => upd(i, 'passport', e.target.value.toUpperCase())} error={err['passport' + i]} /></fieldset>))}
      <fieldset className={card + ' grid gap-3 sm:grid-cols-2'}><legend className="px-2 font-semibold">Contact</legend>
        <Field label="Email" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} error={err.email} />
        <Field label="Phone" type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} error={err.phone} /></fieldset>
      <button className={primary + ' w-full'}>Confirm booking</button>
    </form>
  )
}

/* ---------------- Payment ---------------- */
export function Payment() {
  const { flight, extra, search: s, seats, passengers, addons, setAddons, confirm } = useStore(); const nav = useNavigate(); const pax = paxOf(s)
  const [m, setM] = useState('card'); const [c, setC] = useState({ num: '', exp: '', cvc: '' }); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false)
  if (!flight || !passengers.length) return <Empty text="Complete the passenger details first." to="/passengers" label="Passenger details" />
  const fare = totalPrice(flight, s) + extra.reduce((t, f) => t + totalPrice(f, s), 0), sf = seats.reduce((t, id) => t + (id ? seatFee(id) : 0), 0), af = addonFee(addons, pax), total = fare + sf + af
  const pay = (e) => {
    e.preventDefault()
    if (m === 'card') {
      const er = {}; const n = c.num.replace(/\s/g, '')
      if (!/^\d{16}$/.test(n)) er.num = 'Enter 16 digits'
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(c.exp)) er.exp = 'Use MM/YY'
      if (!/^\d{3,4}$/.test(c.cvc)) er.cvc = '3–4 digits'
      setErr(er); if (Object.keys(er).length) return
    }
    setBusy(true); setTimeout(() => nav('/confirmation/' + confirm(m)), 1800)
  }
  const Row = ({ l, v }) => <div className="flex justify-between text-sm"><span className="text-muted">{l}</span><span>{v}</span></div>
  return (
    <form onSubmit={pay} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4"><h1 className="text-2xl font-bold">Add-ons & payment</h1><Hold />
        <fieldset className={card + ' space-y-3'}><legend className="px-2 font-semibold">Extras (per passenger)</legend>
          <div className="flex flex-wrap gap-2">{[[0, 'Standard bag'], [10, '+10 kg $25'], [20, '+20 kg $45']].map(([v, l]) => <label key={v} className={ghost + (addons.bag === v ? ' !border-sky-brand text-sky-brand' : '') + ' cursor-pointer'}><input type="radio" name="bag" className="sr-only" checked={addons.bag === v} onChange={() => setAddons({ ...addons, bag: v })} />{l}</label>)}</div>
          <label className="block text-sm text-muted">Meal<select className={input + ' mt-1'} value={addons.meal} onChange={(e) => setAddons({ ...addons, meal: e.target.value })}>{['Standard', 'Vegetarian', 'Halal', 'Asian'].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-emerald-500" checked={addons.priority} onChange={() => setAddons({ ...addons, priority: !addons.priority })} />Priority boarding (+$15)</label></fieldset>
        <fieldset className={card + ' space-y-3'}><legend className="px-2 font-semibold">Payment (simulation, no real charge)</legend>
          <div className="flex flex-wrap gap-2">{[['card', 'Card'], ['wallet', 'Wallet'], ['later', 'Pay later']].map(([k, l]) => <label key={k} className={ghost + (m === k ? ' !border-sky-brand text-sky-brand' : '') + ' cursor-pointer'}><input type="radio" name="pm" className="sr-only" checked={m === k} onChange={() => setM(k)} />{l}</label>)}</div>
          {m === 'card' && <div className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Card number" inputMode="numeric" placeholder="4242 4242 4242 4242" value={c.num} onChange={(e) => setC({ ...c, num: e.target.value })} error={err.num} /></div>
            <Field label="Expiry (MM/YY)" value={c.exp} onChange={(e) => setC({ ...c, exp: e.target.value })} error={err.exp} /><Field label="CVC" inputMode="numeric" value={c.cvc} onChange={(e) => setC({ ...c, cvc: e.target.value })} error={err.cvc} /></div>}
          {m !== 'card' && <p className="text-sm text-muted">{m === 'wallet' ? 'You will be redirected to your wallet app (simulated).' : 'Your booking is reserved for 24 hours. Pay from My trips before the timer ends, or it is cancelled automatically.'}</p>}</fieldset>
      </div>
      <aside className={card + ' h-fit space-y-2 lg:sticky lg:top-20'}><h2 className="text-lg font-bold">{flight.from} → {flight.to}</h2>
        <Row l="Fare" v={money(fare)} /><Row l="Seats" v={money(sf)} /><Row l="Add-ons" v={money(af)} />
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
        <button className={primary + ' w-full'} disabled={busy}>{busy ? 'Processing…' : m === 'later' ? 'Reserve now, pay later' : `Confirm & pay ${money(total)}`}</button></aside>
    </form>
  )
}

function DuePay({ b }) {
  const { payBooking, expireUnpaid } = useStore(); const [now, setNow] = useState(Date.now()); const [open, setOpen] = useState(false)
  const [m, setM] = useState('card'); const [c, setC] = useState({ num: '', exp: '', cvc: '' }); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false)
  useEffect(() => { const t = setInterval(() => { setNow(Date.now()); expireUnpaid() }, 1000); return () => clearInterval(t) }, [])
  if (b.payStatus !== 'unpaid' || b.status !== 'upcoming') return null
  const left = Math.max(0, Math.floor((b.payDue - now) / 1000)); const p2 = (n) => String(n).padStart(2, '0')
  const submit = (e) => {
    e.preventDefault()
    if (m === 'card') {
      const er = {}
      if (!/^\d{16}$/.test(c.num.replace(/\s/g, ''))) er.num = 'Enter 16 digits'
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(c.exp)) er.exp = 'Use MM/YY'
      if (!/^\d{3,4}$/.test(c.cvc)) er.cvc = '3–4 digits'
      setErr(er); if (Object.keys(er).length) return
    }
    setBusy(true); setTimeout(() => payBooking(b.ref), 1500)
  }
  return (
    <div className="w-full rounded-xl border border-amber-brand p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-amber-brand">Payment due in <b>{p2(Math.floor(left / 3600))}:{p2(Math.floor((left % 3600) / 60))}:{p2(left % 60)}</b> · Amount due <b>{money(calcTotal(b))}</b></span>
        <button type="button" className={primary} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Pay now'}</button></div>
      {open && <form onSubmit={submit} noValidate className="page mt-3 grid gap-3 sm:grid-cols-3">
        <div className="flex flex-wrap gap-2 sm:col-span-3">{[['card', 'Card'], ['wallet', 'Wallet']].map(([k, l]) => <label key={k} className={ghost + (m === k ? ' !border-sky-brand text-sky-brand' : '') + ' cursor-pointer'}><input type="radio" name={'dpm' + b.ref} className="sr-only" checked={m === k} onChange={() => setM(k)} />{l}</label>)}</div>
        {m === 'card' ? <>
          <Field label="Card number" inputMode="numeric" placeholder="4242 4242 4242 4242" value={c.num} onChange={(e) => setC({ ...c, num: e.target.value })} error={err.num} />
          <Field label="Expiry (MM/YY)" value={c.exp} onChange={(e) => setC({ ...c, exp: e.target.value })} error={err.exp} />
          <Field label="CVC" inputMode="numeric" value={c.cvc} onChange={(e) => setC({ ...c, cvc: e.target.value })} error={err.cvc} /></> : <p className="text-muted sm:col-span-3">You will be redirected to your wallet app to approve the payment (simulated).</p>}
        <button className={primary + ' sm:col-span-3'} disabled={busy}>{busy ? 'Processing payment…' : `Pay ${money(calcTotal(b))}`}</button></form>}
    </div>)
}

/* ---------------- Confirmation ---------------- */
const pad = (n) => String(n).padStart(2, '0')
const before = (t, m) => { const [h, mi] = t.split(':').map(Number); const x = (((h * 60 + mi - m) % 1440) + 1440) % 1440; return pad(Math.floor(x / 60)) + ':' + pad(x % 60) }
const stamp = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00'
const save = (blobOrUrl, name) => { const a = document.createElement('a'); a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl); a.download = name; a.click() }
function Confetti() {
  const colors = ['#10b981', '#f59e0b', '#22c55e', '#84cc16', '#ef4444']
  return <div className="pointer-events-none fixed inset-0 overflow-hidden print:hidden" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <span key={i} className="absolute -top-4 h-3 w-2 rounded-sm" style={{ left: `${(i * 37) % 100}%`, background: colors[i % 5], animation: `fall ${2.5 + (i % 5) * 0.4}s ease-in ${(i % 7) * 0.15}s forwards` }} />)}</div>
}
export function Confirmation() {
  const { ref } = useParams(); const b = useStore((x) => x.bookings.find((y) => y.ref === ref)); const [flip, setFlip] = useState(false); const front = useRef(null)
  if (!b) return <Empty text="We could not find this booking." to="/dashboard" label="My trips" />
  const f = b.flight, A = getAirport(f.from), B = getAirport(f.to); const r = createRng(b.ref); const gate = 'ABCD'[r.int(0, 3)] + r.int(1, 24)
  const ics = () => {
    const ev = (x) => ['BEGIN:VEVENT', `UID:${b.ref}-${x.flightNumber}@aerolink`, `DTSTAMP:${stamp(x.date, '00:00')}`, `DTSTART:${stamp(x.date, x.departTime)}`, `DTEND:${stamp(addDays(x.date, x.arriveDayOffset), x.arriveTime)}`, `SUMMARY:Flight ${x.flightNumber} ${x.from} to ${x.to}`, `DESCRIPTION:Booking ${b.ref}`, 'END:VEVENT']
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AeroLink//EN', ...ev(f), ...(b.extra || []).flatMap(ev), 'END:VCALENDAR'].join('\r\n')
    save(new Blob([txt], { type: 'text/calendar' }), `aerolink-${b.ref}.ics`)
  }
  const png = async () => { setFlip(false); save(await toPng(front.current, { pixelRatio: 2, backgroundColor: '#0d1b2a' }), `boarding-pass-${b.ref}.png`) }
  const ad = b.addons || {}
  return (
    <div className="mx-auto max-w-2xl"><Confetti />
      <div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success text-2xl text-white">✓</div>
        <h1 className="mt-3 text-3xl font-bold">{b.payStatus === 'unpaid' ? 'Booking reserved' : 'Booking confirmed'}</h1><p className="text-muted">Reference <b className="text-ink">{b.ref}</b></p></div>
      <div className="mt-4 print:hidden"><DuePay b={b} /></div>
      <div className="mt-6 [perspective:1200px]"><div className={'flip-inner grid transition-transform duration-700 [transform-style:preserve-3d] ' + (flip ? '[transform:rotateY(180deg)]' : '')}>
        <div ref={front} className={card + ' overflow-hidden !p-0 [grid-area:1/1] [backface-visibility:hidden]'}>
          <div className="flex justify-between bg-blue-brand px-5 py-3 text-white"><b>AEROLINK BOARDING PASS</b><span>{f.airline} {f.flightNumber}</span></div>
          <div className="grid grid-cols-3 items-center gap-2 p-5 text-center">
            <div><div className="font-display text-4xl">{f.from}</div><div className="text-sm text-muted">{A.city}</div><div className="mt-1 font-semibold">{f.departTime}</div></div>
            <div className="text-2xl text-sky-brand">✈<div className="text-xs text-muted">{formatDuration(f.durationMin)}</div></div>
            <div><div className="font-display text-4xl">{f.to}</div><div className="text-sm text-muted">{B.city}</div><div className="mt-1 font-semibold">{f.arriveTime}{f.arriveDayOffset > 0 ? ` +${f.arriveDayOffset}` : ''}</div></div></div>
          <div className="grid items-end gap-4 border-t border-dashed border-line p-5 text-sm sm:grid-cols-[1fr_auto]">
            <div><div className="grid grid-cols-3 gap-2"><div><span className="text-muted">Date</span><div className="font-semibold">{nice(f.date).slice(0, 11)}</div></div><div><span className="text-muted">Gate</span><div className="font-semibold">{gate}</div></div><div><span className="text-muted">Boarding</span><div className="font-semibold">{before(f.departTime, 45)}</div></div></div>
              <div className="mt-3">{b.passengers.map((p, i) => <div key={i} className="flex justify-between py-0.5"><span>{p.first} {p.last}</span><b>Seat {b.seats[i]}</b></div>)}</div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 font-bold"><span>{b.payStatus === 'unpaid' ? 'Amount due' : 'Total paid'}</span><span>{money(calcTotal(b))}</span></div></div>
            <div className="rounded-lg bg-white p-2"><QRCodeSVG value={`AEROLINK|${b.ref}|${f.flightNumber}|${f.from}-${f.to}|${f.date}|${b.seats.join(',')}`} size={92} /></div></div></div>
        <div className={card + ' flip-back [grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)] space-y-2 text-sm'}>
          <h2 className="text-lg font-bold">Trip details</h2>
          <p><span className="text-muted">Baggage:</span> {f.baggage.cabin} kg cabin + {f.baggage.checked + (ad.bag || 0)} kg checked</p>
          <p><span className="text-muted">Meal:</span> {ad.meal || 'Standard'}{ad.priority ? ' · Priority boarding' : ''}</p>
          <p><span className="text-muted">Aircraft:</span> {f.aircraft} · <span className="text-muted">Contact:</span> {b.contact?.email}</p>
          <ul className="list-disc space-y-1 pl-5 text-muted"><li>Arrive at the airport 3 hours before an international flight.</li><li>Gate closes 20 minutes before departure.</li><li>Carry your passport and this booking reference.</li><li>Sample booking for demonstration, not a real ticket.</li></ul></div>
      </div></div>
      {(b.extra || []).map((x, k) => <div key={k} className={card + ' mt-4 text-sm'}><b>Flight {k + 2}</b> · {x.airline} {x.flightNumber}<div className="mt-1 text-muted">{x.from} → {x.to} · {nice(x.date)} · {x.departTime} → {x.arriveTime}{x.arriveDayOffset > 0 ? ` +${x.arriveDayOffset}` : ''} · Seats {(b.extraSeats?.[k] || []).join(', ')}</div></div>)}
      <div className="mt-5 flex flex-wrap justify-center gap-3 print:hidden">
        <button className={ghost} onClick={() => setFlip(!flip)}>{flip ? 'Show pass' : 'View details'}</button><button className={ghost} onClick={png}>Download image</button><button className={ghost} onClick={ics}>Add to calendar</button><button className={ghost} onClick={() => window.print()}>Print / PDF</button><Link to="/dashboard" className={primary}>My trips</Link></div>
    </div>
  )
}

/* ---------------- Dashboard ---------------- */
function Weather({ code, date }) {
  const a = getAirport(code); const r = createRng(code + date.slice(0, 7))
  const t = Math.round(30 - Math.abs(a.lat) * 0.45 + r.int(-4, 4)); const c = ['Sunny', 'Partly cloudy', 'Cloudy', 'Light rain'][r.int(0, 3)]
  return <div className={card}><div className="text-sm text-muted">Weather in {a.city} (estimate)</div><div className="font-display text-3xl">{t}°C</div><div>{c}</div></div>
}
function SeatGrid({ taken, chosen, onPick }) {
  return (
    <div className="mx-auto w-fit rounded-t-[60px] border border-line bg-surface-2 px-6 pb-4 pt-10" role="group" aria-label="Seat map">
      <div className="mb-2 grid grid-cols-[28px_repeat(3,32px)_20px_repeat(3,32px)] gap-1 text-center text-xs text-muted"><span />{COLS.slice(0, 3).map((c) => <span key={c}>{c}</span>)}<span />{COLS.slice(3).map((c) => <span key={c}>{c}</span>)}</div>
      {Array.from({ length: ROWS }, (_, i) => i + 1).map((r) => (
        <div key={r} className={'mb-1 grid grid-cols-[28px_repeat(3,32px)_20px_repeat(3,32px)] items-center gap-1 ' + (r === 12 ? 'mt-4' : '')}>
          <span className="text-xs text-muted">{r}</span>
          {COLS.map((c, k) => {
            const id = r + c; const t = taken.has(id); const mine = chosen.includes(id)
            return [k === 3 && <span key={'g' + r} />,
              <button key={id} type="button" disabled={t} aria-label={`Seat ${id}${t ? ', taken' : seatFee(id) ? ', fee ' + money(seatFee(id)) : ''}`} onClick={() => onPick(id)}
                className={'h-8 w-8 rounded-md text-xs font-semibold transition ' + (t ? 'bg-line opacity-40' : mine ? 'scale-110 bg-sky-brand text-navy-950' : seatFee(id) ? 'border border-amber-brand hover:bg-amber-brand/20' : 'border border-line hover:bg-surface')}>{c}</button>]
          })}
        </div>))}
    </div>)
}

export function Manage({ b, updateBooking }) {
  const base = b.addons || { bag: 0, meal: 'Standard', priority: false }
  const [d, setD] = useState({ passengers: b.passengers, seats: b.seats, extraSeats: b.extraSeats || [], addons: base })
  const [saved, setSaved] = useState(''); const [payOpen, setPayOpen] = useState(false); const [busy, setBusy] = useState(false)
  const [m, setM] = useState('card'); const [c, setC] = useState({ num: '', exp: '', cvc: '' }); const [err, setErr] = useState({})
  const [kf, setKf] = useState(0); const [ap, setAp] = useState(0)
  const up = (patch) => { setSaved(''); setPayOpen(false); setD({ ...d, ...patch }) }
  const flights = [b.flight, ...(b.extra || [])]
  const seatsOf = (k) => (k === 0 ? d.seats : d.extraSeats[k - 1] || [])
  const origOf = (k) => (k === 0 ? b.seats : (b.extraSeats || [])[k - 1] || [])
  const putSeats = (k, n) => (k === 0 ? up({ seats: n }) : up({ extraSeats: d.extraSeats.map((arr, x) => (x === k - 1 ? n : arr)) }))
  const pick = (k, id) => { const cur = seatsOf(k); const j = cur.indexOf(id); const n = [...cur]; if (j >= 0 && j !== ap) n[j] = cur[ap]; n[ap] = id; putSeats(k, n) }
  if (hoursLeft(b) < 24) return <div className="mt-3 w-full border-t border-line pt-3 text-sm text-amber-brand">Online changes are closed within 24 hours of departure. Please contact the airline.</div>
  const nameFee = d.passengers.filter((p, i) => p.first !== b.passengers[i].first || p.last !== b.passengers[i].last).length * 25
  const seatChg = flights.reduce((t, _, k) => t + seatsOf(k).filter((x, i) => x !== origOf(k)[i]).length, 0) * 10
  const nb = { ...b, passengers: d.passengers, seats: d.seats, extraSeats: d.extraSeats, addons: d.addons, fees: (b.fees || 0) + nameFee + seatChg }
  const delta = calcTotal(nb) - calcTotal(b)
  const changed = nameFee > 0 || seatChg > 0 || JSON.stringify(d.addons) !== JSON.stringify(base)
  const apply = () => {
    updateBooking(b.ref, { passengers: d.passengers, seats: d.seats, extraSeats: d.extraSeats, addons: d.addons, fees: nb.fees })
    setSaved(delta < 0 ? `Saved. ${money(-delta)} will be refunded to your original payment method in 5–7 days.` : delta > 0 ? `Payment of ${money(delta)} received. Changes saved.` : 'Changes saved.'); setPayOpen(false)
  }
  const pay = (e) => {
    e.preventDefault()
    if (m === 'card') {
      const er = {}
      if (!/^\d{16}$/.test(c.num.replace(/\s/g, ''))) er.num = 'Enter 16 digits'
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(c.exp)) er.exp = 'Use MM/YY'
      if (!/^\d{3,4}$/.test(c.cvc)) er.cvc = '3–4 digits'
      setErr(er); if (Object.keys(er).length) return
    }
    setBusy(true); setTimeout(() => { apply(); setBusy(false); setC({ num: '', exp: '', cvc: '' }) }, 1500)
  }
  return (
    <div className="mt-3 w-full space-y-3 border-t border-line pt-3 text-sm">
      <p className="text-muted">Name change $25 each · seat change $10 each (plus any seat upgrade fee) · baggage and priority at listed prices. Online changes close 24 hours before departure.</p>
      {d.passengers.map((p, i) => <div key={i} className="grid gap-2 sm:grid-cols-2">
        <input aria-label={`Passenger ${i + 1} first name`} className={input} value={p.first} onChange={(e) => up({ passengers: d.passengers.map((x, j) => (j === i ? { ...x, first: e.target.value } : x)) })} />
        <input aria-label={`Passenger ${i + 1} last name`} className={input} value={p.last} onChange={(e) => up({ passengers: d.passengers.map((x, j) => (j === i ? { ...x, last: e.target.value } : x)) })} /></div>)}
      <div className="space-y-2"><p className="font-semibold">Change seats</p>
        {flights.length > 1 && <div className="flex flex-wrap gap-2">{flights.map((f, k) => <button key={k} type="button" className={ghost + (kf === k ? ' !border-sky-brand text-sky-brand' : '')} onClick={() => setKf(k)}>Flight {k + 1}: {f.from} → {f.to}</button>)}</div>}
        <div className="flex flex-wrap gap-2">{d.passengers.map((p, i) => <button key={i} type="button" className={ghost + (ap === i ? ' !border-sky-brand text-sky-brand' : '')} onClick={() => setAp(i)}>{p.first || 'Passenger ' + (i + 1)}: {seatsOf(kf)[i]}</button>)}</div>
        <p className="text-xs text-muted">Pick a passenger, then tap a free seat. Grey seats are taken. Amber seats have a fee. Tapping a seat held by another passenger swaps the two.</p>
        <div className="max-h-96 overflow-y-auto rounded-xl"><SeatGrid taken={takenSeats(flights[kf])} chosen={seatsOf(kf)} onPick={(id) => pick(kf, id)} /></div></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <select aria-label="Baggage" className={input} value={d.addons.bag} onChange={(e) => up({ addons: { ...d.addons, bag: +e.target.value } })}><option value={0}>Standard bag</option><option value={10}>+10 kg ($25)</option><option value={20}>+20 kg ($45)</option></select>
        <select aria-label="Meal" className={input} value={d.addons.meal} onChange={(e) => up({ addons: { ...d.addons, meal: e.target.value } })}>{['Standard', 'Vegetarian', 'Halal', 'Asian'].map((x) => <option key={x}>{x}</option>)}</select>
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-emerald-500" checked={d.addons.priority} onChange={() => up({ addons: { ...d.addons, priority: !d.addons.priority } })} />Priority boarding</label></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
        <span>{!changed ? 'No changes yet' : delta > 0 ? <>Extra to pay: <b>{money(delta)}</b></> : delta < 0 ? <>Refund to you: <b className="text-success">{money(-delta)}</b></> : 'No extra charge'}</span>
        <button type="button" className={primary} disabled={!changed || busy} onClick={() => (delta > 0 ? setPayOpen(true) : apply())}>{delta > 0 ? `Continue to pay ${money(delta)}` : 'Save changes'}</button></div>
      {payOpen && delta > 0 && <form onSubmit={pay} noValidate className="page grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
        <div className="font-semibold sm:col-span-3">Pay {money(delta)} (simulation, no real charge)</div>
        <div className="flex flex-wrap gap-2 sm:col-span-3">{[['card', 'Card'], ['wallet', 'Wallet']].map(([k, l]) => <label key={k} className={ghost + (m === k ? ' !border-sky-brand text-sky-brand' : '') + ' cursor-pointer'}><input type="radio" name={'mpm' + b.ref} className="sr-only" checked={m === k} onChange={() => setM(k)} />{l}</label>)}</div>
        {m === 'card' ? <>
          <Field label="Card number" inputMode="numeric" placeholder="4242 4242 4242 4242" value={c.num} onChange={(e) => setC({ ...c, num: e.target.value })} error={err.num} />
          <Field label="Expiry (MM/YY)" value={c.exp} onChange={(e) => setC({ ...c, exp: e.target.value })} error={err.exp} />
          <Field label="CVC" inputMode="numeric" value={c.cvc} onChange={(e) => setC({ ...c, cvc: e.target.value })} error={err.cvc} /></> : <p className="text-muted sm:col-span-3">You will be redirected to your wallet app to approve the payment (simulated).</p>}
        <button className={primary + ' sm:col-span-3'} disabled={busy}>{busy ? 'Processing payment…' : `Pay ${money(delta)} & save`}</button></form>}
      {saved && <p className="text-success">{saved} New total: {money(calcTotal(b))}</p>}
    </div>)
}
export function Dashboard() {
  const { bookings, cancel, updateBooking, expireUnpaid } = useStore(); useEffect(() => { expireUnpaid() }, []); const [tab, setTab] = useState('upcoming'); const [ask, setAsk] = useState(null); const [open, setOpen] = useState(null); const [chk, setChk] = useState({})
  const today = new Date().toISOString().slice(0, 10)
  const kind = (b) => (b.status === 'cancelled' ? 'cancelled' : b.flight.date < today ? 'past' : 'upcoming')
  const live = bookings.filter((b) => b.status !== 'cancelled'); const up = bookings.filter((b) => kind(b) === 'upcoming')
  const next = [...up].sort((a, b) => a.flight.date.localeCompare(b.flight.date))[0]
  const days = next ? Math.ceil((new Date(next.flight.date) - new Date()) / 864e5) : null
  const km = live.reduce((t, b) => t + [b.flight, ...(b.extra || [])].reduce((u, x) => u + distanceKm(getAirport(x.from), getAirport(x.to)), 0), 0)
  const countries = new Set(live.flatMap((b) => [b.flight, ...(b.extra || [])].flatMap((x) => [getAirport(x.from).country, getAirport(x.to).country]))).size
  const freq = {}; live.forEach((b) => { freq[b.flight.to] = (freq[b.flight.to] || 0) + 1 })
  const fav = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0]
  const shown = bookings.filter((b) => kind(b) === tab); const stat = (l, v) => <div className={card}><div className="text-sm text-muted">{l}</div><div className="font-display text-2xl">{v}</div></div>
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">My trips</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className={card}><div className="text-sm text-muted">Next trip</div>{next ? <><div className="font-display text-3xl">{days > 0 ? `${days} days` : days === 0 ? 'Today' : 'Departed'}</div><div className="text-sm">{next.flight.from} → {next.flight.to} · {nice(next.flight.date)}</div></> : <div className="text-muted">No upcoming trips</div>}</div>
        {stat('Trips booked', live.length)}{stat('Total spent', money(live.filter((b) => b.payStatus !== 'unpaid').reduce((t, b) => t + calcTotal(b), 0)))}{stat('Distance traveled', km.toLocaleString() + ' km')}{stat('Countries', countries)}{stat('Favorite destination', fav ? getAirport(fav).city : '–')}
      </div>
      {live.length > 0 && <div className={card}><h2 className="mb-2 text-lg font-bold">Your routes</h2><RouteMap routes={live.flatMap((b) => [b.flight, ...(b.extra || [])].map((x) => ({ from: x.from, to: x.to })))} className="h-56 w-full text-ink" /></div>}
      {next && <Weather code={next.flight.to} date={next.flight.date} />}
      {live.length > 0 && <section className={card}><h2 className="mb-2 text-lg font-bold">Spending per trip</h2>{live.map((b) => <div key={b.ref} className="mb-1 flex items-center gap-2 text-sm"><span className="w-24 shrink-0 text-muted">{b.flight.from}→{b.flight.to}</span><div className="h-3 rounded bg-sky-brand transition-all" style={{ width: `${Math.max(6, (calcTotal(b) / Math.max(...live.map(calcTotal))) * 100)}%` }} /><b>{money(calcTotal(b))}</b></div>)}</section>}
      <div className="flex gap-2">{['upcoming', 'past', 'cancelled'].map((t) => <button key={t} onClick={() => setTab(t)} className={ghost + ' capitalize' + (tab === t ? ' !border-sky-brand text-sky-brand' : '')}>{t}</button>)}</div>
      {!shown.length && <Empty text={`No ${tab} trips.`} to="/" label="Search flights" />}
      {shown.map((b) => (
        <article key={b.ref} className={card + ' page flex flex-wrap items-center justify-between gap-3'}>
          <div><div className="font-display text-xl">{pathOf(b)}</div>
            <div className="text-sm text-muted">{nice(b.flight.date)}{b.extra?.length ? ` · ${b.extra.length + 1} flights` : ''} · {b.flight.departTime} · {b.flight.airline} {b.flight.flightNumber}</div>
            <div className="text-sm">Ref {b.ref} · Seats {b.seats.join(', ')} · {money(calcTotal(b))}</div>
            {b.status === 'cancelled' && (b.expired ? <div className="text-sm text-danger">Cancelled: payment was not received within 24 hours.</div> : <div className="text-sm text-success">Refunded: {money(b.refund || 0)}</div>)}</div>
          <div className="flex flex-wrap gap-2"><Link to={'/confirmation/' + b.ref} className={ghost}>View pass</Link>
            {kind(b) === 'upcoming' && <><button className={ghost} aria-expanded={open === b.ref} onClick={() => setOpen(open === b.ref ? null : b.ref)}>Manage</button>
              {ask === b.ref ? <><span className="basis-full text-sm text-amber-brand">{refundOf(b) > 0 ? `You will get ${money(refundOf(b))} back (${refundPct(b) * 100}%).` : b.payStatus === 'unpaid' ? 'You have not paid yet, so there is nothing to refund.' : 'No refund: departure is within 24 hours.'} Policy: 7+ days 100%, 1–7 days 50%, under 24 hours none.</span><button className={btn + 'bg-danger text-white'} onClick={() => { updateBooking(b.ref, { status: 'cancelled', refund: refundOf(b) }); setAsk(null) }}>Yes, cancel</button><button className={ghost} onClick={() => setAsk(null)}>Keep</button></> : <button className={ghost} onClick={() => setAsk(b.ref)}>Cancel booking</button>}</>}</div>
          <DuePay b={b} />
          {open === b.ref && kind(b) === 'upcoming' && <Manage b={b} updateBooking={updateBooking} />}
        </article>))}
      <section className={card}><h2 className="mb-2 text-lg font-bold">Travel checklist & baggage</h2><p className="mb-2 text-sm text-muted">Economy usually includes a 7 kg cabin bag and 20–30 kg checked baggage. Check your pass for your exact allowance.</p>
        <div className="grid gap-1 text-sm sm:grid-cols-2">{['Valid passport (6+ months)', 'Visa or entry permit', 'Travel insurance', 'Airport transfer', 'Check baggage allowance', 'Online check-in'].map((t) => <label key={t} className="flex items-center gap-2"><input type="checkbox" checked={!!chk[t]} onChange={() => setChk({ ...chk, [t]: !chk[t] })} className="accent-emerald-500" />{t}</label>)}</div></section>
    </div>
  )
}