import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell, LabelList
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ── Canada's Food Guide produce benchmark ─────────────────────────────────────
// Source: Canada's Food Guide (Health Canada, 2007): adults 19–50 yr, 7–8 servings/day
// 1 serving of vegetable or fruit ≈ 125 mL (½ cup) ≈ 80 g fresh weight
// Conservative adult midpoint: 7 servings × 80 g = 560 g/day
// Annual per person: 560 g/day × 365 days = 204.4 kg/person/year
const CFG_G_PER_DAY   = 560
const CFG_KG_PER_YEAR = CFG_G_PER_DAY * 365 / 1000   // 204.4 kg/year

function fmt(t) {
  if (t == null) return '—'
  if (t >= 1000) return `${(t/1000).toFixed(1)}k t`
  return `${Math.round(t).toLocaleString()} t`
}

function fmtPeople(t) {
  if (t == null) return '—'
  const people = (t * 1000) / CFG_KG_PER_YEAR
  if (people >= 1e6) return `${(people/1e6).toFixed(2)}M people`
  if (people >= 1000) return `${Math.round(people/1000)}k people`
  return `${Math.round(people)}`
}

const FLAG_STYLES = {
  partial:       { bg: '#fefce8', border: '#fde68a', text: '#713f12', icon: '◑' },
  extrapolated:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '~' },
  preliminary:   { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', icon: '⚠' },
}

function KPICard({ label, value, sub, color, trend, trendVal }) {
  const TIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const tColor = trend === 'up' ? 'var(--accent2)' : trend === 'down' ? 'var(--danger)' : 'var(--text-muted)'
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px 22px',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
      borderTop: `3px solid ${color}`, minWidth: 0,
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 4px', letterSpacing: '-1px' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {trendVal && <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: tColor, fontSize: 12, fontWeight: 600 }}>
          <TIcon size={13} />{trendVal}
        </div>}
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow)', fontSize: 13 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function ExecutiveSummary({ yearSummary, allYears, year, filteredItems, ftcTotals = {} }) {
  if (!yearSummary) return null

  const prevYear = allYears.find(d => d.year === year - 1)
  const yoyPct   = prevYear?.total_t
    ? ((yearSummary.total_t - prevYear.total_t) / prevYear.total_t * 100).toFixed(1)
    : null
  const yoyTrend = yoyPct == null ? null : yoyPct > 0 ? 'up' : yoyPct < 0 ? 'down' : 'flat'

  const trendData = allYears.map(d => ({
    year: d.year,
    'Farm-Gate': Math.round(d.farmgate_t),
    'Retail':    Math.round(d.retail_t),
    flag: d.flag,
  }))

  const topItems = [...filteredItems]
    .filter(d => d.total_t != null)
    .sort((a, b) => (b.total_t||0) - (a.total_t||0))
    .slice(0, 10)

  const flagStyle = yearSummary.flag ? FLAG_STYLES[yearSummary.flag] : null

  return (
    <div>
      {/* KPI row — 4 cards, person-days removed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KPICard
          label="Total Recoverable" value={fmt(yearSummary.total_t)} color="var(--accent)"
          sub={`covers ${fmtPeople(yearSummary.total_t)} annual needs`}
          trend={yoyTrend} trendVal={yoyPct ? `${yoyPct > 0 ? '+' : ''}${yoyPct}% YoY` : null}
        />
        <KPICard
          label="Farm-Gate Surplus" value={fmt(yearSummary.farmgate_t)} color="var(--accent2)"
          sub={`covers ${fmtPeople(yearSummary.farmgate_t)} annual needs`}
        />
        <KPICard
          label="Retail Surplus" value={fmt(yearSummary.retail_t)} color="var(--accent3)"
          sub={`${yearSummary.retail_t && yearSummary.total_t ? Math.round(yearSummary.retail_t/yearSummary.total_t*100) : '—'}% of total`}
        />
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px 22px',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
          borderTop: '3px solid #059669', minWidth: 0,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            People Fed (Annual CFG)
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#059669', margin: '8px 0 2px', letterSpacing: '-1px' }}>
            {fmtPeople(yearSummary.total_t)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            full-year produce supply
          </div>
          <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2 }}>
            <div style={{
              height: 3, borderRadius: 2, background: '#059669',
              width: `${Math.min(100, (yearSummary.farmgate_t / yearSummary.total_t) * 100)}%`,
              opacity: 0.6,
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            Farm-gate: {fmtPeople(yearSummary.farmgate_t)} · Retail: {fmtPeople(yearSummary.retail_t)}
          </div>
        </div>
      </div>

      {/* Data quality flag (only shown when flagged) */}
      {flagStyle && (
        <div style={{
          background: flagStyle.bg, borderRadius: 8, padding: '10px 14px',
          border: `1px solid ${flagStyle.border}`, fontSize: 12, color: flagStyle.text,
          marginBottom: 16,
        }}>
          <strong>{flagStyle.icon} {year} data quality:</strong>{' '}
          {yearSummary.flag_note}
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px 20px 12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Surplus Trend 2010–2025</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Farm-gate and retail recovery (tonnes) · flags shown in dropdown
          </div>
          {/* Flag legend inline */}
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, flexWrap: 'wrap' }}>
            {[{f:'partial',l:'Incomplete/interpolated'},{f:'extrapolated',l:'Consumption extrapolated'},{f:'preliminary',l:'Preliminary production'}].map(({f,l}) => (
              <span key={f} style={{ display:'flex', alignItems:'center', gap:3 }}>
                <span style={{ fontWeight:700 }}>{FLAG_STYLES[f].icon}</span> {l}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={195}>
            <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#059669" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradRT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              {/* Shade extrapolated/preliminary region */}
              <ReferenceArea x1={2023} x2={2025} fill="#f59e0b" fillOpacity={0.06} />
              <ReferenceLine x={2022} stroke="#9ca3af" strokeDasharray="3 2" strokeWidth={1}
                label={{ value: 'last fully\nobserved', position: 'insideTopLeft', fontSize: 9, fill: '#9ca3af' }} />
              <ReferenceLine x={year} stroke="var(--accent)" strokeDasharray="4 2" strokeWidth={1.5} />
              <Area type="monotone" dataKey="Farm-Gate" stroke="#059669" strokeWidth={2} fill="url(#gradFG)" name="Farm-Gate" />
              <Area type="monotone" dataKey="Retail"    stroke="#f59e0b" strokeWidth={2} fill="url(#gradRT)" name="Retail" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px 20px 12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Top Surplus Items — {year}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Total recoverable by produce (tonnes)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topItems} layout="vertical" margin={{ top: 4, right: 80, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="item" tick={{ fontSize: 11 }} width={78} interval={0} />
              <Tooltip formatter={(v) => [`${Math.round(v).toLocaleString()} t`, 'Surplus']} />
              <Bar dataKey="total_t" name="Total Surplus" radius={[0,3,3,0]}>
                <LabelList dataKey="total_t" position="right" style={{ fontSize: 8, fill: '#9ca3af' }}
                  formatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k t` : `${Math.round(v)} t`} />
                {topItems.map((entry, i) => (
                  <Cell key={i} fill={entry.category === 'Fruits' ? '#f59e0b' : '#059669'} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'flex-end' }}>
            {['Fruits','Vegetables'].map((c, i) => (
              <span key={c} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: i ? '#059669' : '#f59e0b', display:'inline-block' }}/>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* GVFB FTC callout */}
      {(ftcTotals[2024] || ftcTotals[2025]) && (
        <div style={{
          background: 'linear-gradient(135deg, #e8f3fb, #f0fdf4)',
          border: '1px solid #bee3f8', borderRadius: 10, padding: '14px 20px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🚜</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f4c81' }}>GVFB Farm-to-Community Collections</div>
              <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                {ftcTotals[2024] && <span><strong>{Math.round(ftcTotals[2024]).toLocaleString()} t</strong> collected in 2024</span>}
                {ftcTotals[2024] && ftcTotals[2025] && <span style={{ color: '#9ca3af' }}> · </span>}
                {ftcTotals[2025] && <span><strong>{Math.round(ftcTotals[2025]).toLocaleString()} t</strong> in 2025</span>}
                {' '}through the farm gate procurement program.
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#1d6fa4', fontWeight: 500, whiteSpace: 'nowrap' }}>
            See <em>Farm Gate Procured</em> tab for details →
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '9px 14px', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        Farm-gate: Second Harvest (2024) loss rates × StatsCan production · Retail: provincial mass balance (CIMT + FAOSTAT) · Shaded area = extrapolated / preliminary · ±30% uncertainty · Click <em>About this tool</em> for full methodology.
      </div>
    </div>
  )
}
