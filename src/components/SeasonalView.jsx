import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, ReferenceArea
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Generate a distinct color for any year by cycling through a palette
const PALETTE = [
  '#6366f1','#3b82f6','#06b6d4','#059669','#f59e0b',
  '#f43f5e','#8b5cf6','#84cc16','#f97316','#ec4899',
  '#14b8a6','#78716c','#0ea5e9','#a16207','#dc2626',
  '#7c3aed',
]
function yearColor(yr) {
  // Anchor 2022 (last fully-observed) to a fixed warm amber
  const anchors = { 2022: '#f59e0b', 2021: '#059669', 2020: '#06b6d4', 2019: '#3b82f6', 2018: '#6366f1' }
  if (anchors[yr]) return anchors[yr]
  return PALETTE[(yr - 2010) % PALETTE.length]
}

// Flags: items whose monthly disaggregation is based on MAFF calendar (less reliable than FTC)
const MAFF_ITEMS = new Set(['Blueberries and cranberries','Strawberries','Raspberries','Cherries',
  'Peaches and nectarines','Pears','Plums and sloes','Grapes','Asparagus','Spinach',
  'Lettuce and chicory','Green garlic','Eggplants (aubergines)','Watermelons','Cantaloupes and other melons'])

function fmt(v) { return v == null ? '—' : `${v.toFixed(1)} t` }

const CustomTooltip = ({ active, payload, label, showFlag }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'#fff', border:'1px solid var(--border)', borderRadius:8,
      padding:'10px 14px', boxShadow:'var(--shadow)', fontSize:13, minWidth:160,
    }}>
      <div style={{ fontWeight:600, marginBottom:6 }}>{MONTHS[label-1]}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, marginBottom:2 }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </div>
      ))}
      {showFlag && (
        <div style={{ marginTop:6, fontSize:11, color:'#d97706', display:'flex', alignItems:'center', gap:4 }}>
          ⚠ Seasonal index from MAFF calendar
        </div>
      )}
    </div>
  )
}

export default function SeasonalView({ monthly, allMonthly, year, item, allYears }) {
  const [compareYears, setCompareYears] = useState([year])
  const isMaff = item !== 'All' && MAFF_ITEMS.has(item)

  // Aggregate monthly data to (month) for the selected year and filters
  const monthAgg = Array.from({length:12},(_,i) => {
    const m = i+1
    const filtered = monthly.filter(d => d.month === m)
    return {
      month: m,
      farmgate_t: filtered.reduce((s,d) => s + (d.farmgate_t||0), 0),
      farmgate_low: filtered.reduce((s,d) => s + (d.farmgate_low||0), 0),
      farmgate_high: filtered.reduce((s,d) => s + (d.farmgate_high||0), 0),
    }
  })

  // Multi-year comparison: for each comparison year, monthly totals
  const multiYearData = Array.from({length:12},(_,i) => {
    const m = i+1
    const row = { month: m, label: MONTHS[i] }
    compareYears.forEach(yr => {
      const filtered = allMonthly.filter(d =>
        d.year === yr && d.month === m && (item === 'All' || d.item === item))
      row[yr] = filtered.reduce((s,d) => s + (d.farmgate_t||0), 0)
    })
    return row
  })

  // Peak month
  const peak = monthAgg.reduce((best,d) => d.farmgate_t > (best?.farmgate_t||0) ? d : best, null)

  const toggleYear = (yr) => {
    setCompareYears(prev =>
      prev.includes(yr) ? (prev.length > 1 ? prev.filter(y => y !== yr) : prev) : [...prev, yr])
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Seasonal Patterns</h2>
        <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
          Monthly upstream surplus estimates for {year}{item !== 'All' ? ` · ${item}` : ' · All produce'}.
          {peak && <> Peak harvest window: <strong>{MONTHS[peak.month-1]}</strong> ({peak.farmgate_t.toFixed(0)} t).</>}
        </p>
      </div>

      {isMaff && (
        <div style={{
          background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 14px',
          fontSize:12, color:'#92400e', marginBottom:16, display:'flex', gap:8, alignItems:'flex-start',
        }}>
          <span style={{ fontSize:16 }}>⚠️</span>
          <div>
            <strong>Data quality note:</strong> Monthly distribution for <em>{item}</em> is derived from
            BC MAFF harvest calendar indices (Tier 2), not from observed donation data. Seasonal shape is
            based on expert elicitation and may not perfectly reflect year-to-year variation.
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Monthly bar with uncertainty bands */}
        <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'20px 20px 12px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Monthly Upstream Surplus — {year}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>
            Central estimate (tonnes) · error bars show ±30% sensitivity
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthAgg} margin={{ top:4, right:8, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="month" tickFormatter={m => MONTHS[m-1].slice(0,3)} tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:11 }} />
              <Tooltip content={<CustomTooltip showFlag={isMaff} />} />
              <Bar dataKey="farmgate_t" name="Upstream" radius={[3,3,0,0]}>
                {monthAgg.map((entry,i) => (
                  <Cell key={i} fill={entry.month === peak?.month ? '#059669' : '#6ee7b7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', marginTop:4 }}>
            🟢 Peak month highlighted
          </div>
        </div>

        {/* Multi-year comparison */}
        <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'20px 20px 12px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Year-over-Year Comparison</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>Select years to compare seasonal shapes</div>
          {/* Year toggles */}
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
            {allYears.map(yr => (
              <button key={yr} onClick={() => toggleYear(yr)} style={{
                padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:500,
                border:'1px solid', cursor:'pointer', transition:'all .15s',
                background: compareYears.includes(yr) ? yearColor(yr) : 'transparent',
                color: compareYears.includes(yr) ? '#fff' : 'var(--text-secondary)',
                borderColor: compareYears.includes(yr) ? yearColor(yr) : 'var(--border)',
              }}>{yr}</button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={multiYearData} margin={{ top:4, right:8, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="label" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:11 }} />
              <Tooltip formatter={(v,n) => [`${v.toFixed(1)} t`, n]} />
              {compareYears.map(yr => (
                <Line key={yr} type="monotone" dataKey={yr} stroke={yearColor(yr)}
                  strokeWidth={2} dot={{ r:3 }} name={String(yr)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap-style summary */}
      <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'20px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Seasonal Intensity Map</div>
        <div style={{ display:'grid', gridTemplateColumns:'80px repeat(12,1fr)', gap:4, alignItems:'center' }}>
          {/* Header row */}
          <div />
          {MONTHS.map(m => (
            <div key={m} style={{ textAlign:'center', fontSize:11, color:'var(--text-secondary)', fontWeight:500 }}>{m}</div>
          ))}
          {/* Year rows */}
          {allYears.map(yr => {
            const yrData = Array.from({length:12},(_,i) => {
              const m = i+1
              const filtered = allMonthly.filter(d =>
                d.year === yr && d.month === m && (item === 'All' || d.item === item))
              return filtered.reduce((s,d) => s + (d.farmgate_t||0), 0)
            })
            const maxVal = Math.max(...yrData, 1)
            return (
              <>
                <div key={`lbl-${yr}`} style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>{yr}</div>
                {yrData.map((v, mi) => {
                  const intensity = v / maxVal
                  return (
                    <div key={mi} title={`${MONTHS[mi]}: ${v.toFixed(0)} t`} style={{
                      height:28, borderRadius:4,
                      background: `rgba(5,150,105,${0.08 + intensity * 0.85})`,
                      border: `1px solid rgba(5,150,105,${0.15 + intensity * 0.4})`,
                      transition: 'all .15s', cursor:'default',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:9, color: intensity > 0.6 ? '#fff' : 'transparent',
                    }}>
                      {intensity > 0.4 ? Math.round(v) : ''}
                    </div>
                  )
                })}
              </>
            )
          })}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:12 }}>
          Colour intensity reflects share of annual upstream surplus in each month. Hover cells for exact values.
        </div>
      </div>
    </div>
  )
}
