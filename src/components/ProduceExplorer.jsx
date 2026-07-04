import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts'

const YEAR_COLORS = { 2018:'#6366f1',2019:'#3b82f6',2020:'#06b6d4',2021:'#059669',2022:'#f59e0b' }
const KEY_MAP = { farmgate: 'farmgate_t', retail: 'retail_t', total: 'total_t' }
const LABEL_MAP = { farmgate: 'Farm-Gate Surplus', retail: 'Retail Surplus', total: 'Total Recoverable' }

const T_TO_LBS = 2204.62
function fmt(v) {
  if (!v) return '—'
  const lbs = v * T_TO_LBS
  if (lbs >= 1e6) return `${(lbs/1e6).toFixed(1)}M lbs`
  if (lbs >= 1000) return `${Math.round(lbs/1000).toLocaleString()}k lbs`
  return `${Math.round(lbs).toLocaleString()} lbs`
}

export default function ProduceExplorer({ items, allItems, year, allYears, surplusType }) {
  const [sortBy, setSortBy] = useState('total_t')
  const [view, setView] = useState('bar')   // 'bar' | 'trend' | 'compare'
  const [selectedItems, setSelectedItems] = useState([])

  const key = KEY_MAP[surplusType] || 'total_t'

  // Ranked items for bar chart
  const ranked = [...items]
    .filter(d => d[key] != null)
    .sort((a, b) => (b[key]||0) - (a[key]||0))

  // Trend data for selected items
  const allItemNames = [...new Set(allItems.map(d => d.item))].sort()
  const selectedForTrend = selectedItems.length ? selectedItems : ranked.slice(0, 5).map(d => d.item)

  const trendData = allYears.map(yr => {
    const row = { year: yr }
    selectedForTrend.forEach(item => {
      const d = allItems.find(x => x.year === yr && x.item === item)
      row[item] = d?.[key] ?? null
    })
    return row
  })

  const toggleItem = (item) => {
    setSelectedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev.slice(-4), item]
    )
  }

  // Category totals
  const fruits = items.filter(d => d.category === 'Fruits' && d[key] != null)
  const vegs   = items.filter(d => d.category === 'Vegetables' && d[key] != null)
  const fruitsTotal = fruits.reduce((s,d) => s + (d[key]||0), 0)
  const vegsTotal   = vegs.reduce((s,d) => s + (d[key]||0), 0)
  const grandTotal  = fruitsTotal + vegsTotal

  const btnStyle = (active) => ({
    padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
    border:'1px solid', transition:'all .15s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
  })

  return (
    <div>
      <div style={{ marginBottom:20, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Produce Explorer — {year}</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
            Showing <strong>{LABEL_MAP[surplusType]}</strong> across {ranked.length} produce types.
          </p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['bar','trend','compare'].map(v => (
            <button key={v} onClick={() => setView(v)} style={btnStyle(view === v)}>
              {v === 'bar' ? '📊 Ranked' : v === 'trend' ? '📈 Trend' : '⚖️ Compare'}
            </button>
          ))}
        </div>
      </div>

      {/* Category split cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
        {[
          { label:'🍎 Fruits', val:fruitsTotal, pct:grandTotal ? fruitsTotal/grandTotal*100 : 0, color:'#f59e0b' },
          { label:'🥦 Vegetables', val:vegsTotal, pct:grandTotal ? vegsTotal/grandTotal*100 : 0, color:'#059669' },
          { label:'Total', val:grandTotal, pct:100, color:'var(--accent)' },
        ].map(({ label, val, pct, color }) => (
          <div key={label} style={{
            background:'var(--surface)', borderRadius:'var(--radius)', padding:'16px 18px',
            border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)',
          }}>
            <div style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:500 }}>{label}</div>
            <div style={{ fontSize:26, fontWeight:700, margin:'4px 0', color, letterSpacing:'-0.5px' }}>{fmt(val)}</div>
            <div style={{ height:4, background:'var(--surface2)', borderRadius:2, marginTop:8 }}>
              <div style={{ height:4, width:`${pct}%`, background:color, borderRadius:2, opacity:0.8 }} />
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{pct.toFixed(0)}% of total</div>
          </div>
        ))}
      </div>

      {view === 'bar' && (
        <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'20px 20px 12px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Ranked by {LABEL_MAP[surplusType]}</div>
          <ResponsiveContainer width="100%" height={Math.max(260, ranked.length * 28)}>
            <BarChart data={ranked} layout="vertical" margin={{ top:0, right:60, left:130, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11 }} tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }} />
              <YAxis type="category" dataKey="item" tick={{ fontSize:11 }} width={125} />
              <Tooltip formatter={(v) => [fmt(v), LABEL_MAP[surplusType]]} />
              <Bar dataKey={key} name={LABEL_MAP[surplusType]} radius={[0,3,3,0]}>
                {ranked.map((entry, i) => (
                  <Cell key={i} fill={entry.category === 'Fruits' ? '#f59e0b' : '#059669'} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'trend' && (
        <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'20px 20px 12px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Trend Over Time</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>
            Click items below to add/remove from chart (max 5)
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
            {allItemNames.map(it => (
              <button key={it} onClick={() => toggleItem(it)} style={{
                padding:'3px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                border:'1px solid', fontWeight:500, transition:'all .15s',
                background: selectedForTrend.includes(it) ? 'var(--accent)' : 'transparent',
                color: selectedForTrend.includes(it) ? '#fff' : 'var(--text-secondary)',
                borderColor: selectedForTrend.includes(it) ? 'var(--accent)' : 'var(--border)',
              }}>{it}</button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top:4, right:8, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="year" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:11 }} tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }} />
              <Tooltip formatter={(v) => v != null ? [fmt(v)] : ['—']} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              {selectedForTrend.map((item, i) => (
                <Line key={item} type="monotone" dataKey={item} strokeWidth={2}
                  stroke={Object.values(YEAR_COLORS)[i % 5]} dot={{ r:3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'compare' && (
        <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'20px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Farm-Gate vs Retail Breakdown</div>
          <ResponsiveContainer width="100%" height={Math.max(260, ranked.length * 28)}>
            <BarChart data={ranked} layout="vertical" margin={{ top:0, right:60, left:130, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11 }} tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }} />
              <YAxis type="category" dataKey="item" tick={{ fontSize:11 }} width={125} />
              <Tooltip formatter={(v, n) => [fmt(v||0), n]} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <Bar dataKey="farmgate_t" name="Farm-Gate" stackId="a" fill="#1d6fa4" opacity={0.85} radius={[0,0,0,0]} />
              <Bar dataKey="retail_t" name="Retail" stackId="a" fill="#7c3aed" opacity={0.85} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
