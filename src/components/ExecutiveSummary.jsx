import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const CFG_G_PER_DAY   = 560
const CFG_KG_PER_YEAR = CFG_G_PER_DAY * 365 / 1000
const T_TO_LBS = 2204.62

function fmt(t) {
  if (t == null) return '—'
  const lbs = t * T_TO_LBS
  if (lbs >= 1e6) return `${(lbs/1e6).toFixed(1)}M lbs`
  if (lbs >= 1000) return `${Math.round(lbs/1000).toLocaleString()}k lbs`
  return `${Math.round(lbs).toLocaleString()} lbs`
}

function fmtPeople(t) {
  if (t == null) return '—'
  const people = (t * 1000) / CFG_KG_PER_YEAR
  if (people >= 1e6) return `${(people/1e6).toFixed(2)}M people`
  if (people >= 1000) return `${Math.round(people/1000)}k people`
  return `${Math.round(people)}`
}

const FLAG_STYLES = {
  partial:      { bg: '#fefce8', border: '#fde68a', text: '#713f12', icon: '◑' },
  extrapolated: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '~' },
  preliminary:  { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', icon: '⚠' },
}

function KPICard({ label, value, sub, color, trend, trendVal }) {
  const TIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const tColor = trend === 'up' ? 'var(--upstream)' : trend === 'down' ? 'var(--danger)' : 'var(--text-muted)'
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

export default function ExecutiveSummary({ yearSummary, allYears, year, filteredItems, ftcTotals = {} }) {
  if (!yearSummary) return null

  const prevYear = allYears.find(d => d.year === year - 1)
  const yoyPct   = prevYear?.total_t
    ? ((yearSummary.total_t - prevYear.total_t) / prevYear.total_t * 100).toFixed(1)
    : null
  const yoyTrend = yoyPct == null ? null : yoyPct > 0 ? 'up' : yoyPct < 0 ? 'down' : 'flat'

  const topItems = [...filteredItems]
    .filter(d => d.total_t != null)
    .sort((a, b) => (b.total_t || 0) - (a.total_t || 0))
    .slice(0, 15)

  const flagStyle = yearSummary.flag ? FLAG_STYLES[yearSummary.flag] : null

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KPICard
          label="Total Recoverable" value={fmt(yearSummary.total_t)} color="var(--accent)"
          sub={`covers ${fmtPeople(yearSummary.total_t)} annual needs`}
          trend={yoyTrend} trendVal={yoyPct ? `${yoyPct > 0 ? '+' : ''}${yoyPct}% YoY` : null}
        />
        <KPICard
          label="Upstream Surplus" value={fmt(yearSummary.farmgate_t)} color="var(--upstream)"
          sub={`covers ${fmtPeople(yearSummary.farmgate_t)} annual needs`}
        />
        <KPICard
          label="Downstream Surplus" value={fmt(yearSummary.retail_t)} color="var(--downstream)"
          sub={`${yearSummary.retail_t && yearSummary.total_t ? Math.round(yearSummary.retail_t / yearSummary.total_t * 100) : '—'}% of total`}
        />
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px 22px',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
          borderTop: '3px solid var(--harvest)', minWidth: 0,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            People Fed (Annual CFG)
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--harvest)', margin: '8px 0 2px', letterSpacing: '-1px' }}>
            {fmtPeople(yearSummary.total_t)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>full-year produce supply</div>
          <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2 }}>
            <div style={{
              height: 3, borderRadius: 2, background: 'var(--upstream)',
              width: `${Math.min(100, (yearSummary.farmgate_t / yearSummary.total_t) * 100)}%`,
              opacity: 0.6,
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            Upstream: {fmtPeople(yearSummary.farmgate_t)} · Downstream: {fmtPeople(yearSummary.retail_t)}
          </div>
        </div>
      </div>

      {/* Stacked bar chart — top produce by upstream + downstream */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 3 }}>Top Surplus Produce — {year}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upstream and downstream recovery combined · ranked by total recoverable</div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, flexShrink: 0, paddingTop: 2 }}>
            {[['Upstream', '#174A67'], ['Downstream', '#E98A3A']].map(([name, c]) => (
              <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                {name}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(360, topItems.length * 26)}>
          <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 90, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number" tick={{ fontSize: 11 }}
              tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }}
            />
            <YAxis type="category" dataKey="item" tick={{ fontSize: 11 }} width={115} interval={0} />
            <Tooltip
              formatter={(v, name) => [fmt(v), name === 'farmgate_t' ? 'Upstream' : 'Downstream']}
              contentStyle={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow)' }}
              labelStyle={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}
            />
            <Bar dataKey="farmgate_t" name="farmgate_t" stackId="a" fill="#174A67" radius={[0, 0, 0, 0]} />
            <Bar dataKey="retail_t"   name="retail_t"   stackId="a" fill="#E98A3A" radius={[0, 3, 3, 0]}
              label={({ x, y, width, height, index }) => {
                const total = topItems[index]?.total_t
                if (!total) return null
                return (
                  <text x={x + width + 7} y={y + height / 2} dominantBaseline="middle"
                    fontSize={9.5} fill="var(--text-muted)" fontWeight="500">
                    {fmt(total)}
                  </text>
                )
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
