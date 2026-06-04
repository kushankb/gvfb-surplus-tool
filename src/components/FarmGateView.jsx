import { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const CAR_COLORS = {
  '5901': '#2166ac', '5902': '#4393c3', '5903': '#92c5de', '5904': '#d1e5f0',
  '5905': '#fddbc7', '5906': '#f4a582', '5907': '#d6604d', '5908': '#b2182b',
}

const CAR_FULL_NAMES = {
  '5901': 'Vancouver Island – Coast',
  '5902': 'Lower Mainland – Southwest',
  '5903': 'Thompson – Okanagan',
  '5904': 'Kootenay',
  '5905': 'Cariboo',
  '5906': 'North Coast',
  '5907': 'Nechako',
  '5908': 'Peace River',
}

function fmt(v) { if (!v) return '—'; return v >= 1000 ? `${(v/1000).toFixed(1)}k t` : `${Math.round(v)} t` }

// ── Latitude-corrected equirectangular projection ─────────────────────────────
// At BC's mean latitude (~54°N), 1° longitude ≈ cos(54°)×111 km ≈ 65 km,
// while 1° latitude ≈ 111 km. Without correction, east-west distances are over-drawn.
function project(lon, lat, bbox, w, h, pad = 22) {
  const [minLon, minLat, maxLon, maxLat] = bbox
  const midLat = (minLat + maxLat) / 2
  const cosLat = Math.cos(midLat * Math.PI / 180)

  const lonSpanDeg = maxLon - minLon
  const latSpanDeg = maxLat - minLat
  const lonSpanKm  = lonSpanDeg * cosLat   // corrected east-west span
  const aspect     = lonSpanKm / latSpanDeg // width:height ratio (~1.28 for BC)

  const availW = w - 2 * pad
  const availH = h - 2 * pad

  let drawW, drawH, ox, oy
  if (availW / availH > aspect) {
    drawH = availH; drawW = drawH * aspect
    ox = pad + (availW - drawW) / 2; oy = pad
  } else {
    drawW = availW; drawH = drawW / aspect
    ox = pad; oy = pad + (availH - drawH) / 2
  }

  const x = ox + ((lon - minLon) * cosLat / lonSpanKm) * drawW
  const y = oy + ((maxLat - lat)           / latSpanDeg) * drawH
  return [x, y]
}

function getBBox(features) {
  let minLon=Infinity, minLat=Infinity, maxLon=-Infinity, maxLat=-Infinity
  const visit = (c) => {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number') {
      if (c[0]<minLon) minLon=c[0]; if (c[0]>maxLon) maxLon=c[0]
      if (c[1]<minLat) minLat=c[1]; if (c[1]>maxLat) maxLat=c[1]
    } else c.forEach(visit)
  }
  features.forEach(f => visit(f.geometry.coordinates))
  return [minLon, minLat, maxLon, maxLat]
}

function geometryToPath(geom, bbox, w, h) {
  const proj = c => project(c[0], c[1], bbox, w, h)
  const ring  = r => r.map((c,i) => { const [x,y]=proj(c); return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')+'Z'
  if (geom.type === 'Polygon')      return geom.coordinates.map(ring).join(' ')
  if (geom.type === 'MultiPolygon') return geom.coordinates.flatMap(p => p.map(ring)).join(' ')
  return ''
}

function getCentroid(geom, bbox, w, h) {
  const proj = c => project(c[0], c[1], bbox, w, h)
  let sx=0, sy=0, n=0
  const visit = c => {
    if (typeof c[0]==='number') { const [x,y]=proj(c); sx+=x; sy+=y; n++ }
    else c.forEach(visit)
  }
  visit(geom.coordinates)
  return [sx/n, sy/n]
}

export default function FarmGateView({ carData, allCAR, monthly, allMonthly, year, item, allYears }) {
  const [geojson, setGeojson] = useState(null)
  const [hovered, setHovered] = useState(null)
  const W = 520, H = 400

  useEffect(() => { import('../data/bcCars.js').then(m => setGeojson(m.default)) }, [])

  // CAR totals for selected year
  const carTotals = useMemo(() => {
    const agg = {}
    carData.forEach(d => {
      const uid = d.car_uid || d.car_code
      if (!agg[uid]) agg[uid] = { uid, car_name: d.car_name, farmgate_t: 0 }
      agg[uid].farmgate_t += d.farmgate_t || 0
    })
    return Object.values(agg).sort((a,b) => b.farmgate_t - a.farmgate_t)
  }, [carData])

  const maxVal    = Math.max(...carTotals.map(d => d.farmgate_t), 1)
  const totalFG   = carTotals.reduce((s,d) => s+d.farmgate_t, 0)

  const { bbox, paths, centroids } = useMemo(() => {
    if (!geojson) return { bbox: null, paths: {}, centroids: {} }
    const bb = getBBox(geojson.features)
    const paths = {}, centroids = {}
    geojson.features.forEach(f => {
      const uid = f.properties.CARUID
      paths[uid]     = geometryToPath(f.geometry, bb, W, H)
      centroids[uid] = getCentroid(f.geometry, bb, W, H)
    })
    return { bbox: bb, paths, centroids }
  }, [geojson])

  // Monthly seasonal aggregate
  const monthAgg = useMemo(() =>
    Array.from({length:12}, (_,i) => {
      const m = i+1
      const rows = monthly.filter(d => d.month === m)
      return { month: m, label: MONTHS[i], farmgate_t: rows.reduce((s,d) => s+(d.farmgate_t||0), 0) }
    }), [monthly])

  const peakMonth = monthAgg.reduce((b,d) => d.farmgate_t > (b?.farmgate_t||0) ? d : b, null)

  // Hover trend for CAR
  const hoverTrend = useMemo(() => {
    if (!hovered) return []
    return allCAR.filter(d => d.car_uid === hovered || d.car_code === hovered)
      .sort((a,b) => a.year-b.year)
      .map(d => ({ year: d.year, farmgate_t: d.farmgate_t }))
  }, [hovered, allCAR])

  const hovInfo = carTotals.find(d => d.uid === hovered)

  // Tooltip for month bars
  const MonthTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', boxShadow:'var(--shadow)', fontSize:12 }}>
        <div style={{ fontWeight:600, marginBottom:3 }}>{label}</div>
        <div style={{ color:'#059669' }}>Farm-gate: <strong>{payload[0]?.value?.toFixed(0)} t</strong></div>
        {label === peakMonth?.label && <div style={{ fontSize:11, color:'#d97706', marginTop:3 }}>🌟 Peak harvest month</div>}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Farm-Gate Surplus — {year}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Where and when BC farm-gate surplus is generated.
          {item !== 'All' ? <> Filtered to <strong>{item}</strong>.</> : ' All 26 produce types.'}
          {' '}Peak harvest month: <strong>{peakMonth?.label}</strong> ({peakMonth?.farmgate_t.toFixed(0)} t).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* MAP */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>BC Agricultural Regions</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
              Darker = more surplus · Hover for details
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            Statistics Canada CAR boundary (2021) · latitude-corrected projection
          </div>

          {!geojson ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'var(--text-muted)', fontSize:13 }}>Loading map…</div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
              <rect width={W} height={H} fill="#f0f9ff" rx={6} />
              <rect width={W} height={H} fill="#e0f2fe" rx={6} fillOpacity={0.5} />

              {geojson.features.map(f => {
                const uid = f.properties.CARUID
                const info = carTotals.find(d => d.uid === uid)
                const val  = info?.farmgate_t || 0
                const intensity = val / maxVal
                const isHov = hovered === uid
                const [cx, cy] = centroids[uid] || [0,0]

                return (
                  <g key={uid}
                    onMouseEnter={() => setHovered(uid)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor:'pointer' }}>
                    <path d={paths[uid]||''}
                      fill={CAR_COLORS[uid]||'#94a3b8'}
                      fillOpacity={0.35 + intensity * 0.60}
                      stroke={isHov ? '#0f4c81' : '#fff'}
                      strokeWidth={isHov ? 2 : 0.8}
                      style={{ transition:'fill-opacity .2s,stroke-width .15s' }}
                    />
                    {/* Label */}
                    <text x={cx} y={cy - 5} textAnchor="middle" fontSize={8.5}
                      fill={intensity > 0.5 ? '#fff' : '#1f2937'} fontWeight="600"
                      style={{ pointerEvents:'none', userSelect:'none' }}>
                      {CAR_FULL_NAMES[uid]?.split(' – ')[0] || uid}
                    </text>
                    <text x={cx} y={cy + 6} textAnchor="middle" fontSize={8}
                      fill={intensity > 0.5 ? 'rgba(255,255,255,0.9)' : '#374151'} fontWeight="500"
                      style={{ pointerEvents:'none', userSelect:'none' }}>
                      {val >= 1000 ? `${(val/1000).toFixed(1)}k t` : `${Math.round(val)} t`}
                    </text>
                  </g>
                )
              })}

              {/* Colour scale legend — horizontal bar */}
              <g transform={`translate(${W/2-70},${H-22})`}>
                <text x={-4} y={9} textAnchor="end" fontSize={8} fill="#6b7280">Less</text>
                {[0.05,0.2,0.4,0.6,0.8,0.95].map((v,i) => (
                  <rect key={i} x={i*18} y={0} width={17} height={10} rx={1}
                    fill="#2166ac" fillOpacity={0.20 + v * 0.72} />
                ))}
                <text x={6*18+6} y={9} fontSize={8} fill="#6b7280">More</text>
              </g>
            </svg>
          )}

          {/* Hover panel */}
          {hovered && hovInfo && (
            <div style={{ marginTop:10, background:'var(--accent-light)', borderRadius:8, padding:'12px 14px', border:'1px solid #bee3f8' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>{CAR_FULL_NAMES[hovered] || hovInfo.car_name}</div>
                  <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.5px', margin:'4px 0 2px' }}>{fmt(hovInfo.farmgate_t)}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                    {totalFG > 0 ? (hovInfo.farmgate_t/totalFG*100).toFixed(0) : 0}% of provincial total
                  </div>
                </div>
                {hoverTrend.length > 0 && (
                  <div style={{ width:150, height:60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hoverTrend} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                        <XAxis dataKey="year" tick={{ fontSize:9 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize:9 }} tickFormatter={v => `${Math.round(v/1000)}k`} />
                        <Tooltip formatter={v => [`${Math.round(v)} t`]} />
                        <Line type="monotone" dataKey="farmgate_t" stroke="var(--accent)" strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: seasonal + CAR rank */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Monthly seasonal bars */}
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'16px 18px 10px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Monthly Farm-Gate Surplus — {year}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12 }}>
              Tonnes · peak month highlighted · hover for details
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={monthAgg}
                margin={{ top:4, right:8, left:8, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="label" tick={{ fontSize:10 }} />
                <YAxis
                  tick={{ fontSize:10 }}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  domain={[0, dataMax => Math.ceil(dataMax * 1.15 / 1000) * 1000]}
                />
                <Tooltip content={<MonthTip />} />
                <Bar dataKey="farmgate_t" radius={[3,3,0,0]} isAnimationActive={false}>
                  {monthAgg.map((d,i) => (
                    <Cell key={`cell-${i}`} fill={d.label === peakMonth?.label ? '#059669' : '#6ee7b7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* CAR ranked bars */}
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'16px 18px 10px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Ranked by Region — {year}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12 }}>Hover bar to highlight on map</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={carTotals} layout="vertical" margin={{ top:0, right:40, left:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize:10 }} tickFormatter={v => `${Math.round(v/1000)}k`} />
                <YAxis type="category" dataKey="car_name" tick={{ fontSize:10 }} width={140}
                  tickFormatter={n => n.replace('Lower Mainland–','LM–').replace('Vancouver Island–','VI–').replace('Thompson–','T–')} />
                <Tooltip
                  formatter={v => [`${Math.round(v).toLocaleString()} t`, 'Farm-Gate Surplus']}
                  labelFormatter={n => CAR_FULL_NAMES[carTotals.find(d=>d.car_name===n)?.uid] || n}
                />
                <Bar dataKey="farmgate_t" radius={[0,3,3,0]} isAnimationActive={false}
                  onMouseEnter={d => setHovered(d.uid)}
                  onMouseLeave={() => setHovered(null)}>
                  {carTotals.map((d,i) => (
                    <Cell key={i}
                      fill={CAR_COLORS[d.uid]||'#94a3b8'}
                      fillOpacity={hovered == null || hovered === d.uid ? 0.85 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 16px', border:'1px solid var(--border)', fontSize:12, color:'var(--text-secondary)' }}>
        <strong>Farm-gate only.</strong> Seasonal distribution uses GVFB Farm-to-Community donation data (2024–2025 average)
        for key field crops; BC Ministry of Agriculture harvest calendars for fruits and remaining vegetables.
        Regional downscaling uses Census of Agriculture area shares (2011/2016/2021).
      </div>
    </div>
  )
}
