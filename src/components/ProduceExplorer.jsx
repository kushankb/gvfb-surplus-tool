import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'

const YEAR_PALETTE = [
  '#174A67','#E98A3A','#2E7FA8','#C4652A',
  '#4D9BBF','#AA4A18','#8FBFD6','#E0A060',
  '#1E6A9A','#D4742A','#0d3852','#F0B070',
  '#3D8FB8','#C07040','#5AAED0','#B05820',
]
const yearColor = (yr) => YEAR_PALETTE[(yr - 2010) % YEAR_PALETTE.length]

const KEY_MAP   = { farmgate: 'farmgate_t', retail: 'retail_t', total: 'total_t' }
const LABEL_MAP = { farmgate: 'Upstream Surplus', retail: 'Downstream Surplus', total: 'Total Recoverable' }

const SIMPLE_CAT = (cat) => ['Fruits', 'Tree Fruit'].includes(cat) ? 'Fruits' : 'Vegetables'

const CAT_COLOR = {
  'Fruits':     '#E98A3A',
  'Vegetables': '#174A67',
}
const catColor = (cat) => CAT_COLOR[SIMPLE_CAT(cat)] || '#174A67'

const T_TO_LBS = 2204.62
function fmt(v) {
  if (!v) return '—'
  const lbs = v * T_TO_LBS
  if (lbs >= 1e6) return `${(lbs/1e6).toFixed(1)}M lbs`
  if (lbs >= 1000) return `${Math.round(lbs/1000).toLocaleString()}k lbs`
  return `${Math.round(lbs).toLocaleString()} lbs`
}

export default function ProduceExplorer({ items, allItems, year, allYears, surplusType }) {
  const [view, setView] = useState('trend')
  const [selectedItems, setSelectedItems] = useState([])

  const key = KEY_MAP[surplusType] || 'total_t'

  const ranked = [...items]
    .filter(d => d.total_t != null)
    .sort((a, b) => (b.total_t||0) - (a.total_t||0))

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

  const toggleItem = (item) =>
    setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev.slice(-4), item])

  const upstreamTotal   = items.reduce((s,d) => s+(d.farmgate_t||0), 0)
  const downstreamTotal = items.reduce((s,d) => s+(d.retail_t||0), 0)
  const grandTotal      = items.reduce((s,d) => s+(d.total_t||0), 0)

  const btnStyle = (active, color = 'var(--upstream)') => ({
    padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
    border:'1px solid', transition:'all .15s',
    background: active ? color : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    borderColor: active ? color : 'var(--border)',
  })

  return (
    <div>
      <div style={{ marginBottom:20, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, marginBottom:4, letterSpacing:'-0.3px' }}>Produce Explorer — {year}</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
            Showing <strong>{LABEL_MAP[surplusType]}</strong> across {ranked.length} produce types.
          </p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['trend','Trend'],['compare','Up vs Down']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={btnStyle(view === v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category split cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Upstream',   val:upstreamTotal,   color:'var(--upstream)' },
          { label:'Downstream', val:downstreamTotal, color:'var(--downstream)' },
          { label:'Total',      val:grandTotal,      color:'var(--harvest)' },
        ].map(({ label, val, color }) => {
          const pct = grandTotal ? Math.min(val / grandTotal * 100, 100) : 0
          return (
            <div key={label} style={{
              background:'var(--surface)', borderRadius:'var(--radius)', padding:'14px 16px',
              border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)',
              borderLeft:`3px solid ${color}`,
            }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.3px', fontVariantNumeric:'tabular-nums' }}>{fmt(val)}</div>
              <div style={{ height:3, background:'var(--surface2)', borderRadius:2, marginTop:8 }}>
                <div style={{ height:3, width:`${pct}%`, background:color, borderRadius:2, opacity:0.7 }} />
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{pct.toFixed(0)}% of total</div>
            </div>
          )
        })}
      </div>

      {view === 'trend' && (
        <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'20px 20px 12px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Trend Over Time</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Click items to add/remove from chart (max 5)</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
            {allItemNames.map(it => (
              <button key={it} onClick={() => toggleItem(it)} style={{
                padding:'3px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                border:'1px solid', fontWeight:500, transition:'all .15s',
                background: selectedForTrend.includes(it) ? 'var(--upstream)' : 'transparent',
                color: selectedForTrend.includes(it) ? '#fff' : 'var(--text-secondary)',
                borderColor: selectedForTrend.includes(it) ? 'var(--upstream)' : 'var(--border)',
              }}>{it}</button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top:4, right:8, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="year" tick={{ fontSize:11, fill:'var(--text-muted)' }}
                interval={1} tickFormatter={y => y % 2 === 0 ? y : ''} />
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }} width={38} />
              <Tooltip formatter={(v) => v != null ? [fmt(v)] : ['—']} labelStyle={{ color:'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              {selectedForTrend.map((item, i) => (
                <Line key={item} type="monotone" dataKey={item} strokeWidth={2}
                  stroke={yearColor(2010 + i)} dot={{ r:3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'compare' && (
        <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'20px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Upstream vs Downstream Breakdown</div>
          <div style={{ display:'flex', gap:14, marginBottom:14 }}>
            {[['Upstream','var(--upstream)'],['Downstream','var(--downstream)']].map(([name,c]) => (
              <span key={name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-secondary)' }}>
                <span style={{ width:12, height:12, borderRadius:2, background:c, display:'inline-block' }} />{name}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={Math.max(260, ranked.length * 28)}>
            <BarChart data={ranked} layout="vertical" margin={{ top:0, right:60, left:130, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }} />
              <YAxis type="category" dataKey="item" tick={{ fontSize:11, fill:'var(--text-secondary)' }} width={125} />
              <Tooltip formatter={(v, n) => [fmt(v||0), n]} labelStyle={{ color:'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <Bar dataKey="farmgate_t" name="Upstream"   stackId="a" fill="#174A67" opacity={0.85} radius={[0,0,0,0]} />
              <Bar dataKey="retail_t"   name="Downstream" stackId="a" fill="#E98A3A" opacity={0.85} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
