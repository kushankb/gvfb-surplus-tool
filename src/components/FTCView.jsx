import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, LineChart, Line
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CFG_KG_PER_YEAR = 204.4   // kg / person / year (Canada's Food Guide)

function fmt(t) {
  if (!t) return '—'
  return t >= 1000 ? `${(t / 1000).toFixed(1)}k t` : `${Math.round(t)} t`
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

function KPI({ label, value, sub, color = '#1d6fa4' }) {
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
      <div style={{ color: '#1d6fa4', marginBottom: 2 }}>GVFB procured: <strong>{fmt(procured)}</strong></div>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>Estimated surplus: <strong>{fmt(surplus)}</strong></div>
      {rate && <div style={{ color: '#059669', fontSize: 11 }}>Capture rate: <strong>{rate}%</strong></div>}
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

  // Items that appear in either source, sorted by surplus desc
  const compareData = useMemo(() => {
    const allItems = new Set([...Object.keys(procuredByItem), ...Object.keys(surplusByItem)])
    return [...allItems]
      .map(item => ({
        item,
        procured_t:  Math.round((procuredByItem[item] || 0) * 10) / 10,
        farmgate_t:  Math.round((surplusByItem[item]  || 0) * 10) / 10,
        capture_pct: surplusByItem[item] ? Math.round((procuredByItem[item] || 0) / surplusByItem[item] * 100) : null,
      }))
      .filter(d => d.farmgate_t > 0 || d.procured_t > 0)
      .sort((a, b) => (b.farmgate_t || 0) - (a.farmgate_t || 0))
  }, [procuredByItem, surplusByItem])

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
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>GVFB Farm-to-Community (FTC) Procurement</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          What GVFB has actually collected from BC farms through the FTC program vs the estimated available surplus.
          Data covers Feb 2024 – Mar 2026.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KPI label="FTC Collected — 2024" value={fmt(t2024)} color="#1d6fa4"
          sub={`covers ${fmtPeople(t2024)} annual produce needs`} />
        <KPI label="FTC Collected — 2025" value={fmt(t2025)} color="#1d6fa4"
          sub={yoy ? `${yoy > 0 ? '+' : ''}${yoy}% vs 2024` : 'full-year total'} />
        <KPI label="Total 2024 + 2025" value={fmt(totalAll)} color="#059669"
          sub={`covers ${fmtPeople(totalAll)} annual produce needs`} />
        <KPI label="2025 Capture Rate" value={captureRate2025 ? `${captureRate2025}%` : '—'} color="#7c3aed"
          sub="of estimated BC farm-gate surplus" />
      </div>

      {/* Explanation banner */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
        padding: '12px 18px', marginBottom: 20, fontSize: 13, color: '#166534', lineHeight: 1.7,
      }}>
        <strong>How to read this:</strong> The grey bars show the estimated total BC farm-gate surplus for each crop
        (produce rejected before reaching stores). The blue bars show what GVFB's FTC program actually collected.
        The gap represents surplus that was not recovered — either unavailable to GVFB, discarded, or used elsewhere.
      </div>

      {/* Comparison chart */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>GVFB Procurement vs Estimated Farm-Gate Surplus</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Metric tonnes · hover bars for capture rate</div>
          </div>
          {/* Year toggle */}
          <div style={{ display: 'flex', gap: 6 }}>
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

        <ResponsiveContainer width="100%" height={Math.max(320, compareData.length * 32)}>
          <BarChart data={compareData} layout="vertical" margin={{ top: 0, right: 60, left: 175, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <YAxis type="category" dataKey="item" tick={{ fontSize: 11 }} width={170} interval={0} />
            <Tooltip content={<CompareTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="farmgate_t"  name="Estimated surplus" fill="#cbd5e1" radius={[0, 0, 0, 0]} />
            <Bar dataKey="procured_t"  name="GVFB collected"    fill="#1d6fa4" radius={[0, 3, 3, 0]} opacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly timeline */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Monthly FTC Collections — Feb 2024 to Mar 2026</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Metric tonnes collected per month across all produce types</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 20, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip formatter={v => [`${v} t`, 'Collected']} />
            <Line type="monotone" dataKey="procured_t" stroke="#1d6fa4" strokeWidth={2} dot={{ r: 3 }} name="Collected (t)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '9px 14px', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        <strong>Data source:</strong> GVFB FTC Inbound Data (Feb 2024 – Mar 2026) · Weights converted from pounds to metric tonnes (1 lb = 0.000454 t) ·
        Product names harmonised to Statistics Canada F&V categories · Cucumbers, mushrooms, and corn have no corresponding surplus estimate.
      </div>
    </div>
  )
}
