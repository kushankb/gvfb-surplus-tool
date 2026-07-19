import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CFG_KG_PER_YEAR = 204.4
const T_TO_LBS = 2204.62

function fmt(t) {
  if (!t) return '—'
  const lbs = t * T_TO_LBS
  if (lbs >= 1e6) return `${(lbs/1e6).toFixed(1)}M lbs`
  if (lbs >= 1000) return `${Math.round(lbs/1000).toLocaleString()}k lbs`
  return `${Math.round(lbs).toLocaleString()} lbs`
}
function fmtPeople(t) {
  const p = (t * 1000) / CFG_KG_PER_YEAR
  if (p >= 1e6) return `${(p / 1e6).toFixed(2)}M people`
  if (p >= 1000) return `${Math.round(p / 1000)}k people`
  return `${Math.round(p)}`
}
function pct(a, b) {
  if (!b) return null
  return Math.round((a / b) * 100)
}

function KPI({ label, value, sub, color = '#174A67' }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 3px', letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

const CompareTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const procured = payload.find(p => p.dataKey === 'procured_t')?.value || 0
  const surplus  = payload.find(p => p.dataKey === 'farmgate_t')?.value || 0
  const rate = surplus > 0 ? ((procured / surplus) * 100).toFixed(1) : null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow)', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#174A67', marginBottom: 2 }}>GVFB procured: <strong>{fmt(procured)}</strong></div>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Est. upstream surplus: <strong>{fmt(surplus)}</strong></div>
      {rate && <div style={{ color: '#E98A3A', fontSize: 11 }}>Upstream capture rate: <strong>{rate}%</strong></div>}
    </div>
  )
}

export default function FTCView({ procured, byItem, years }) {
  const [compYear, setCompYear] = useState(2025)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const map = {}
    procured.forEach(d => {
      map[d.year] = (map[d.year] || 0) + d.procured_t
    })
    return map
  }, [procured])

  const t2024 = totals[2024] || 0
  const t2025 = totals[2025] || 0
  const yoy   = t2024 > 0 ? (((t2025 - t2024) / t2024) * 100).toFixed(1) : null

  // ── Comparison data ───────────────────────────────────────────────────────
  // GVFB procured by item for selected comparison year
  const procuredByItem = useMemo(() => {
    const map = {}
    procured.filter(d => d.year === compYear).forEach(d => {
      map[d.item] = (map[d.item] || 0) + d.procured_t
    })
    return map
  }, [procured, compYear])

  // Farm-gate surplus by item for selected year
  const surplusByItem = useMemo(() => {
    const map = {}
    byItem.filter(d => d.year === compYear).forEach(d => {
      if (d.farmgate_t) map[d.item] = d.farmgate_t
    })
    return map
  }, [byItem, compYear])

  // Items that appear in either source
  const compareData = useMemo(() => {
    const allItems = new Set([...Object.keys(procuredByItem), ...Object.keys(surplusByItem)])
    return [...allItems]
      .map(item => ({
        item,
        procured_t:   Math.round((procuredByItem[item] || 0) * 10) / 10,
        farmgate_t:   Math.round((surplusByItem[item]  || 0) * 10) / 10,
        capture_pct:  surplusByItem[item] ? +((procuredByItem[item] || 0) / surplusByItem[item] * 100).toFixed(1) : null,
      }))
      .filter(d => d.farmgate_t > 0 || d.procured_t > 0)
  }, [procuredByItem, surplusByItem])

  // Capture rate: only items GVFB procures with a surplus estimate, sorted high to low
  const captureData = useMemo(() =>
    compareData.filter(d => d.capture_pct != null && d.procured_t > 0).sort((a, b) => b.capture_pct - a.capture_pct)
  , [compareData])

  // ── Monthly timeline ─────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    // For each year, monthly totals
    const byYearMonth = {}
    procured.forEach(d => {
      const key = `${d.year}-${String(d.month).padStart(2,'0')}`
      byYearMonth[key] = (byYearMonth[key] || 0) + d.procured_t
    })
    return Object.entries(byYearMonth)
      .map(([key, val]) => {
        const [yr, mo] = key.split('-')
        return { year: +yr, month: +mo, label: `${MONTHS[+mo-1]} ${yr}`, procured_t: Math.round(val * 10) / 10 }
      })
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
  }, [procured])

  const totalAll = t2024 + t2025
  const captureRate2025 = useMemo(() => {
    const surplusTotal = byItem.filter(d => d.year === 2025).reduce((s, d) => s + (d.farmgate_t || 0), 0)
    return surplusTotal > 0 ? ((t2025 / surplusTotal) * 100).toFixed(1) : null
  }, [byItem, t2025])

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>GVFB Farm Gate Procurement</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          What GVFB has actually collected from BC farms through the farm gate procurement program vs the estimated available surplus.
          Data covers Feb 2024 – Mar 2026.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KPI label="Farm Gate Collected — 2024" value={fmt(t2024)} color="#174A67"
          sub={`covers ${fmtPeople(t2024)} annual produce needs`} />
        <KPI label="Farm Gate Collected — 2025" value={fmt(t2025)} color="#174A67"
          sub={yoy ? `${yoy > 0 ? '+' : ''}${yoy}% vs 2024` : 'full-year total'} />
        <KPI label="Total 2024 + 2025" value={fmt(totalAll)} color="#E98A3A"
          sub={`covers ${fmtPeople(totalAll)} annual produce needs`} />
        <KPI label="2025 Capture Rate" value={captureRate2025 ? `${captureRate2025}%` : '—'} color="#174A67"
          sub="of estimated BC upstream surplus" />
      </div>

      {/* Capture rate chart */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Upstream Surplus Captured by Crop — {compYear}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              % of estimated BC upstream surplus collected by GVFB · sorted highest to lowest · crops with no surplus estimate excluded
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {[2024, 2025].map(yr => (
              <button key={yr} onClick={() => setCompYear(yr)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: '1px solid', cursor: 'pointer', transition: 'all .15s',
                background: compYear === yr ? 'var(--accent)' : 'transparent',
                color: compYear === yr ? '#fff' : 'var(--text-secondary)',
                borderColor: compYear === yr ? 'var(--accent)' : 'var(--border)',
              }}>{yr}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(240, captureData.length * 34)}>
          <BarChart key={compYear} data={captureData} layout="vertical" margin={{ top: 0, right: 55, left: 140, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="item" tick={{ fontSize: 11 }} width={135} interval={0} />
            <Tooltip formatter={(v, name) => [`${v}%`, 'Capture rate']} labelStyle={{ color: 'var(--text-primary)' }}
              contentStyle={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow)' }} />
            <Bar dataKey="capture_pct" name="Capture rate" fill="#174A67" radius={[0, 3, 3, 0]}
              isAnimationActive={false}
              label={({ x, y, width, height, value }) => (
                <text x={x + width + 5} y={y + height / 2} dominantBaseline="middle"
                  fontSize={10} fill="var(--text-muted)" fontWeight="500">
                  {value}%
                </text>
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly timeline */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Monthly Farm Gate Collections — Feb 2024 to Mar 2026</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Pounds collected per month across all produce types</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 20, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }} />
            <Tooltip formatter={v => [fmt(v), 'Collected']} />
            <Line type="monotone" dataKey="procured_t" stroke="#174A67" strokeWidth={2} dot={{ r: 3, fill: '#174A67' }} name="Collected (t)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '9px 14px', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        <strong>Data source:</strong> GVFB Farm-to-Community Inbound Data (Feb 2024 – Mar 2026) · Source weights in pounds, stored as metric tonnes internally, displayed as lbs ·
        Product names harmonised to Statistics Canada F&V categories · Cucumbers, mushrooms, and corn have no corresponding surplus estimate.
      </div>
    </div>
  )
}
