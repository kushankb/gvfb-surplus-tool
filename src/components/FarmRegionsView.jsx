import { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Distinct colors used only in the ranked bar chart (not the choropleth map)
const CAR_COLORS = {
  '5901': '#174A67',
  '5902': '#1E6A9A',
  '5903': '#2E7FA8',
  '5904': '#4D9BBF',
  '5905': '#E98A3A',
  '5906': '#D4742A',
  '5907': '#C4652A',
  '5908': '#AA4A18',
}

// Choropleth: GVFB blue, light (#D8E8F0) → dark (#174A67)
function choroColor(intensity) {
  const r = Math.round(216 + (23  - 216) * intensity)
  const g = Math.round(232 + (74  - 232) * intensity)
  const b = Math.round(240 + (103 - 240) * intensity)
  return `rgb(${r},${g},${b})`
}

const CAR_NAMES = {
  '5901': 'Vancouver Island – Coast',
  '5902': 'Lower Mainland – Southwest',
  '5903': 'Thompson – Okanagan',
  '5904': 'Kootenay',
  '5905': 'Cariboo',
  '5906': 'North Coast',
  '5907': 'Nechako',
  '5908': 'Peace River',
}

const CAR_SHORT = {
  '5901': 'VI–Coast',
  '5902': 'LM–Southwest',
  '5903': 'Thompson–OK',
  '5904': 'Kootenay',
  '5905': 'Cariboo',
  '5906': 'North Coast',
  '5907': 'Nechako',
  '5908': 'Peace River',
}

const T_TO_LBS = 2204.62
function fmt(v) {
  if (!v) return '—'
  const lbs = v * T_TO_LBS
  if (lbs >= 1e6) return `${(lbs/1e6).toFixed(1)}M lbs`
  if (lbs >= 1000) return `${Math.round(lbs/1000).toLocaleString()}k lbs`
  return `${Math.round(lbs).toLocaleString()} lbs`
}

// ── Projected-coordinate → SVG mapping ────────────────────────────────────
// The bc_cars GeoJSON is in Statistics Canada Lambert (a metric projection),
// NOT lat/lon degrees. We simply map X→right, Y→up (flip for SVG), preserving
// the native aspect ratio so BC's shape is undistorted.
function project(x, y, bbox, w, h, pad = 24) {
  const [minX, minY, maxX, maxY] = bbox
  const scaleX = (w - 2 * pad) / (maxX - minX)
  const scaleY = (h - 2 * pad) / (maxY - minY)
  const scale  = Math.min(scaleX, scaleY)       // uniform scale — preserve shape
  const drawW  = (maxX - minX) * scale
  const drawH  = (maxY - minY) * scale
  const ox = pad + ((w - 2 * pad) - drawW) / 2  // centre horizontally
  const oy = pad + ((h - 2 * pad) - drawH) / 2  // centre vertically
  const px = ox + (x - minX) * scale
  const py = oy + (maxY - y) * scale             // flip Y (SVG y grows downward)
  return [px, py]
}

function getBBox(features) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const visit = (c) => {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number') {
      if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0]
      if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1]
    } else c.forEach(visit)
  }
  features.forEach(f => visit(f.geometry.coordinates))
  return [minX, minY, maxX, maxY]
}

function geomToPath(geom, bbox, w, h) {
  const proj = c => project(c[0], c[1], bbox, w, h)
  const ring  = r => r.map((c, i) => { const [x, y] = proj(c); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}` }).join(' ') + 'Z'
  if (geom.type === 'Polygon')      return geom.coordinates.map(ring).join(' ')
  if (geom.type === 'MultiPolygon') return geom.coordinates.flatMap(p => p.map(ring)).join(' ')
  return ''
}

function getCentroid(geom, bbox, w, h) {
  const proj = c => project(c[0], c[1], bbox, w, h)
  let sx = 0, sy = 0, n = 0
  const visit = c => {
    if (typeof c[0] === 'number') { const [x, y] = proj(c); sx += x; sy += y; n++ }
    else c.forEach(visit)
  }
  visit(geom.coordinates)
  return [sx / n, sy / n]
}

// ── Hover tooltip for map region ───────────────────────────────────────────
function RegionTooltip({ uid, info, totalFG }) {
  if (!uid || !info) return null
  return (
    <div style={{
      marginTop: 10, background: 'rgba(29,111,164,.08)', borderRadius: 10, padding: '12px 16px',
      border: '1px solid rgba(29,111,164,.22)', display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ width: 12, height: 36, borderRadius: 3, background: CAR_COLORS[uid] || '#94a3b8', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#174A67' }}>{CAR_NAMES[uid] || info.car_name}</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#111827', margin: '2px 0' }}>
          {fmt(info.farmgate_t)}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          {totalFG > 0 ? (info.farmgate_t / totalFG * 100).toFixed(0) : 0}% of provincial upstream surplus
        </div>
      </div>
    </div>
  )
}

export default function FarmRegionsView({ carData, monthly, year, item }) {
  const [geojson, setGeojson]   = useState(null)
  const [hovered, setHovered]   = useState(null)
  const W = 500, H = 380

  useEffect(() => { import('../data/bcCars.js').then(m => setGeojson(m.default)) }, [])

  // Aggregate CAR totals
  const carTotals = useMemo(() => {
    const agg = {}
    carData.forEach(d => {
      const uid = d.car_uid || d.car_code
      if (!agg[uid]) agg[uid] = { uid, car_name: CAR_NAMES[uid] || d.car_name, farmgate_t: 0 }
      agg[uid].farmgate_t += d.farmgate_t || 0
    })
    return Object.values(agg).sort((a, b) => b.farmgate_t - a.farmgate_t)
  }, [carData])

  const maxVal  = Math.max(...carTotals.map(d => d.farmgate_t), 1)
  const totalFG = carTotals.reduce((s, d) => s + d.farmgate_t, 0)

  // Map geometry
  const { bbox, paths, centroids } = useMemo(() => {
    if (!geojson) return { bbox: null, paths: {}, centroids: {} }
    const bb = getBBox(geojson.features)
    const paths = {}, centroids = {}
    geojson.features.forEach(f => {
      const uid = f.properties.CARUID
      paths[uid]     = geomToPath(f.geometry, bb, W, H)
      centroids[uid] = getCentroid(f.geometry, bb, W, H)
    })
    return { bbox: bb, paths, centroids }
  }, [geojson])

  // Monthly seasonality
  const monthAgg = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const rows = monthly.filter(d => d.month === m)
      return { month: m, label: MONTHS[i], farmgate_t: rows.reduce((s, d) => s + (d.farmgate_t || 0), 0) }
    }), [monthly])

  const peakMonth = monthAgg.reduce((b, d) => d.farmgate_t > (b?.farmgate_t || 0) ? d : b, null)
  const hovInfo   = carTotals.find(d => d.uid === hovered)

  const MonthTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 3 }}>{label}</div>
        <div style={{ color: 'var(--upstream)' }}>Upstream: <strong>{fmt(payload[0]?.value || 0)}</strong></div>
        {label === peakMonth?.label && <div style={{ fontSize: 11, color: 'var(--downstream)', marginTop: 3 }}>🌟 Peak harvest month</div>}
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.3px' }}>
          Upstream Surplus by Region &amp; Season — {year}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Where and when BC upstream surplus is generated.{' '}
          {item !== 'All' ? <><strong>{item}</strong> selected.</> : 'All 40 produce types.'}
          {peakMonth && <> Peak harvest: <strong>{peakMonth.label}</strong> ({fmt(peakMonth.farmgate_t)}).</>}
        </p>
      </div>

      {/* Two-column: Map left | Seasonality + Rankings right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>

        {/* ── MAP ── */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '18px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>BC Agricultural Regions</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Darker = more surplus · hover for details</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            Statistics Canada Census Agricultural Region (CAR) boundaries, 2021
          </div>

          {!geojson ? (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading map…
            </div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              <defs>
                {/* Continuous gradient for the legend bar */}
                <linearGradient id="choroGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor={choroColor(0)} />
                  <stop offset="100%" stopColor={choroColor(1)} />
                </linearGradient>
              </defs>

              {/* Ocean background */}
              <rect width={W} height={H} fill="#C8DCE8" rx={6} />

              {/* Region polygons — single green choropleth */}
              {geojson.features.map(f => {
                const uid       = f.properties.CARUID
                const info      = carTotals.find(d => d.uid === uid)
                const val       = info?.farmgate_t || 0
                const intensity = val / maxVal
                const isHov     = hovered === uid

                return (
                  <g key={uid}
                    onMouseEnter={() => setHovered(uid)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}>
                    <path
                      d={paths[uid] || ''}
                      fill={choroColor(intensity)}
                      stroke={isHov ? '#0f172a' : '#fff'}
                      strokeWidth={isHov ? 2 : 0.8}
                      style={{ transition: 'fill .2s, stroke-width .15s' }}
                    />
                  </g>
                )
              })}

              {/* Region labels */}
              {geojson.features.map(f => {
                const uid       = f.properties.CARUID
                const [cx, cy]  = centroids[uid] || [0, 0]
                const info      = carTotals.find(d => d.uid === uid)
                const val       = info?.farmgate_t || 0
                const intensity = val / maxVal
                const dark      = intensity > 0.5   // switch to white text on darker fills

                return (
                  <g key={`lbl-${uid}`} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    <text x={cx} y={cy - 5} textAnchor="middle" fontSize={8.5}
                      fill={dark ? '#fff' : '#1e293b'} fontWeight="600">
                      {CAR_SHORT[uid] || uid}
                    </text>
                    <text x={cx} y={cy + 7} textAnchor="middle" fontSize={8}
                      fill={dark ? 'rgba(255,255,255,0.85)' : '#374151'} fontWeight="500">
                      {fmt(val)}
                    </text>
                  </g>
                )
              })}

              {/* Continuous gradient legend */}
              {(() => {
                const legW = 160, legH = 10
                const legX = (W - legW) / 2
                const legY = H - 22
                const minLabel = '0'
                const maxLabel = fmt(maxVal)
                return (
                  <g>
                    <rect x={legX} y={legY} width={legW} height={legH} rx={3}
                      fill="url(#choroGrad)" />
                    <text x={legX} y={legY + legH + 9} fontSize={8} fill="#475569" textAnchor="start">
                      {minLabel}
                    </text>
                    <text x={legX + legW / 2} y={legY - 3} fontSize={8} fill="#475569" textAnchor="middle">
                      Upstream surplus
                    </text>
                    <text x={legX + legW} y={legY + legH + 9} fontSize={8} fill="#475569" textAnchor="end">
                      {maxLabel}
                    </text>
                  </g>
                )
              })()}
            </svg>
          )}

          <RegionTooltip uid={hovered} info={hovInfo} totalFG={totalFG} />
        </div>

        {/* ── RIGHT COLUMN: Seasonality + Rankings stacked ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Monthly seasonality — compact */}
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '16px 18px 12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Monthly Seasonality — {year}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Upstream surplus by month · peak month highlighted
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthAgg} margin={{ top: 2, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }}
                  domain={[0, dataMax => Math.ceil(dataMax * 1.15 / 500) * 500]}
                />
                <Tooltip content={<MonthTip />} />
                <Bar dataKey="farmgate_t" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {monthAgg.map((d, i) => (
                    <Cell key={i} fill={d.label === peakMonth?.label ? '#174A67' : 'rgba(23,74,103,.28)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Regional rankings */}
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '16px 18px 12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Ranked by Region — {year}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Upstream surplus · hover to highlight on map
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={carTotals} layout="vertical" margin={{ top: 0, right: 10, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => { const lbs = v * T_TO_LBS; return lbs >= 1e6 ? `${(lbs/1e6).toFixed(0)}M` : `${Math.round(lbs/1000)}k` }} />
                <YAxis type="category" dataKey="car_name" tick={{ fontSize: 9 }} width={130}
                  tickFormatter={n => n.replace('Lower Mainland – ', 'LM – ').replace('Vancouver Island – ', 'VI – ').replace('Thompson – ', 'T – ')} />
                <Tooltip
                  formatter={v => [fmt(v), 'Upstream surplus']}
                  labelFormatter={n => n}
                />
                <Bar dataKey="farmgate_t" radius={[0, 4, 4, 0]} isAnimationActive={false}
                  onMouseEnter={d => setHovered(d.uid)}
                  onMouseLeave={() => setHovered(null)}>
                  {carTotals.map((d, i) => (
                    <Cell key={i}
                      fill={CAR_COLORS[d.uid] || '#94a3b8'}
                      fillOpacity={hovered == null || hovered === d.uid ? 0.85 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>

      {/* Source note */}
      <div style={{ marginTop: 12, background: 'var(--surface2)', borderRadius: 8, padding: '9px 14px', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        <strong>Upstream only.</strong> Regional shares from Statistics Canada Census of Agriculture (2011/2016/2021). Loss rates from Second Harvest (2024). Seasonal patterns from GVFB Farm-to-Community data and BC Ministry of Agriculture harvest calendars.
      </div>
    </div>
  )
}
