import { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'

const CAR_COLORS = {
  '5901': '#2166ac',
  '5902': '#4393c3',
  '5903': '#92c5de',
  '5904': '#d1e5f0',
  '5905': '#fddbc7',
  '5906': '#f4a582',
  '5907': '#d6604d',
  '5908': '#b2182b',
}

const YEAR_COLORS = ['#6366f1','#3b82f6','#06b6d4','#059669','#f59e0b','#f43f5e','#8b5cf6','#84cc16','#f97316','#ec4899','#14b8a6','#78716c','#6b7280']

function fmt(v) { if (!v) return '—'; return v >= 1000 ? `${(v/1000).toFixed(1)}k t` : `${Math.round(v)} t` }

// Simple equirectangular projection with flipped y
function project(lon, lat, bbox, w, h, pad = 20) {
  const [minLon, minLat, maxLon, maxLat] = bbox
  const x = pad + ((lon - minLon) / (maxLon - minLon)) * (w - 2 * pad)
  const y = pad + ((maxLat - lat) / (maxLat - minLat)) * (h - 2 * pad)
  return [x, y]
}

function getBBox(features) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  const visit = (coords) => {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === 'number') {
      const [lon, lat] = coords
      if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
    } else coords.forEach(visit)
  }
  features.forEach(f => visit(f.geometry.coordinates))
  return [minLon, minLat, maxLon, maxLat]
}

function geometryToPath(geom, bbox, w, h) {
  const proj = (c) => project(c[0], c[1], bbox, w, h)
  const ringToD = (ring) => ring.map((c, i) => {
    const [x, y] = proj(c)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ') + 'Z'

  if (geom.type === 'Polygon') {
    return geom.coordinates.map(ringToD).join(' ')
  } else if (geom.type === 'MultiPolygon') {
    return geom.coordinates.flatMap(poly => poly.map(ringToD)).join(' ')
  }
  return ''
}

function getCentroid(geom, bbox, w, h) {
  const proj = (c) => project(c[0], c[1], bbox, w, h)
  let sumX = 0, sumY = 0, count = 0
  const visit = (coords) => {
    if (typeof coords[0] === 'number') { const [x, y] = proj(coords); sumX += x; sumY += y; count++ }
    else coords.forEach(visit)
  }
  visit(geom.coordinates)
  return [sumX / count, sumY / count]
}

export default function GeographicView({ carData, allCAR, year, surplusType }) {
  const [geojson, setGeojson] = useState(null)
  const [hovered, setHovered] = useState(null)
  const W = 520, H = 440

  useEffect(() => {
    import('../data/bcCars.js').then(m => setGeojson(m.default))
  }, [])

  // Aggregate CAR totals for selected year
  const carTotals = useMemo(() => {
    const agg = {}
    carData.forEach(d => {
      const key = d.car_uid || d.car_code
      if (!agg[key]) agg[key] = { uid: key, car_name: d.car_name, farmgate_t: 0 }
      agg[key].farmgate_t += d.farmgate_t || 0
    })
    return Object.values(agg).sort((a, b) => b.farmgate_t - a.farmgate_t)
  }, [carData])

  const maxVal = Math.max(...carTotals.map(d => d.farmgate_t), 1)
  const totalFG = carTotals.reduce((s, d) => s + d.farmgate_t, 0)

  // GeoJSON derived values
  const { bbox, paths, centroids } = useMemo(() => {
    if (!geojson) return { bbox: null, paths: {}, centroids: {} }
    const bb = getBBox(geojson.features)
    const paths = {}, centroids = {}
    geojson.features.forEach(f => {
      const uid = f.properties.CARUID
      paths[uid] = geometryToPath(f.geometry, bb, W, H)
      centroids[uid] = getCentroid(f.geometry, bb, W, H)
    })
    return { bbox: bb, paths, centroids }
  }, [geojson])

  // Trend sparkline for hovered CAR
  const hoveredTrend = useMemo(() => {
    if (!hovered) return []
    return allCAR
      .filter(d => (d.car_uid === hovered || d.car_code === hovered))
      .sort((a, b) => a.year - b.year)
      .map(d => ({ year: d.year, farmgate_t: d.farmgate_t }))
  }, [hovered, allCAR])

  const hoveredInfo = carTotals.find(d => d.uid === hovered)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Geographic Distribution — {year}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Farm-gate surplus across BC's 8 Census Agricultural Regions · Source: Statistics Canada Census of Agriculture boundary file (2021)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>

        {/* Real choropleth map */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>BC Agricultural Regions Map</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Colour intensity = farm-gate surplus · Hover for region details
          </div>

          {!geojson ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontSize: 13 }}>
              Loading map…
            </div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* Ocean/background */}
              <rect width={W} height={H} fill="#e8f4fd" rx={8} />

              {/* CAR polygons */}
              {geojson.features.map(f => {
                const uid = f.properties.CARUID
                const carInfo = carTotals.find(d => d.uid === uid)
                const val = carInfo?.farmgate_t || 0
                const intensity = val / maxVal
                const isHov = hovered === uid
                const baseColor = CAR_COLORS[uid] || '#94a3b8'

                return (
                  <g key={uid}
                    onMouseEnter={() => setHovered(uid)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}>
                    <path
                      d={paths[uid] || ''}
                      fill={baseColor}
                      fillOpacity={0.25 + intensity * 0.65}
                      stroke={isHov ? '#0f4c81' : '#fff'}
                      strokeWidth={isHov ? 2 : 0.8}
                      style={{ transition: 'fill-opacity .2s, stroke-width .15s' }}
                    />
                  </g>
                )
              })}

              {/* Labels on centroids */}
              {geojson.features.map(f => {
                const uid = f.properties.CARUID
                const [cx, cy] = centroids[uid] || [0, 0]
                const carInfo = carTotals.find(d => d.uid === uid)
                const val = carInfo?.farmgate_t || 0
                const name = f.properties.CARENAME.replace(' - ', '\n').replace(' Mainland-', '\nMainland-')
                const shortNames = {
                  '5901': 'VI–Coast',
                  '5902': 'LM–SW',
                  '5903': 'Thompson–OK',
                  '5904': 'Kootenay',
                  '5905': 'Cariboo',
                  '5906': 'North Coast',
                  '5907': 'Nechako',
                  '5908': 'Peace River',
                }
                return (
                  <g key={`lbl-${uid}`}>
                    <text x={cx} y={cy - 6} textAnchor="middle" fontSize={9.5}
                      fill={hovered === uid ? '#0f4c81' : '#1f2937'} fontWeight={hovered === uid ? '700' : '600'}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {shortNames[uid]}
                    </text>
                    <text x={cx} y={cy + 7} textAnchor="middle" fontSize={8.5}
                      fill={hovered === uid ? '#065f46' : '#374151'} fontWeight="500"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {val >= 1000 ? `${(val/1000).toFixed(1)}k t` : `${Math.round(val)} t`}
                    </text>
                  </g>
                )
              })}

              {/* Colour scale legend */}
              <g transform="translate(12, 390)">
                <text fontSize={9} fill="#6b7280">Less</text>
                {[0.1,0.3,0.5,0.7,0.9].map((v, i) => (
                  <rect key={i} x={30 + i*16} y={-8} width={15} height={10} rx={1}
                    fill="#2166ac" fillOpacity={0.25 + v * 0.65} />
                ))}
                <text x={116} fontSize={9} fill="#6b7280">More</text>
              </g>
            </svg>
          )}

          {/* Hover tooltip panel */}
          {hovered && hoveredInfo && (
            <div style={{
              marginTop: 10, background: 'var(--accent-light)', borderRadius: 8, padding: '12px 14px',
              border: '1px solid #bee3f8',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{hoveredInfo.car_name}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0', letterSpacing: '-0.5px' }}>
                    {fmt(hoveredInfo.farmgate_t)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {totalFG > 0 ? (hoveredInfo.farmgate_t / totalFG * 100).toFixed(0) : 0}% of provincial total
                  </div>
                </div>
                {hoveredTrend.length > 0 && (
                  <div style={{ width: 160, height: 60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hoveredTrend} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                        <XAxis dataKey="year" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${Math.round(v/1000)}k`} />
                        <Tooltip formatter={v => [`${Math.round(v)} t`]} labelFormatter={l => `${l}`} />
                        <Line type="monotone" dataKey="farmgate_t" stroke="var(--accent)"
                          strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right panel: ranked bar + year trend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Ranked bars */}
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px 20px 12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ranked by Farm-Gate Surplus</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{year} · tonnes</div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={carTotals} layout="vertical" margin={{ top: 0, right: 50, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v/1000)}k`} />
                <YAxis type="category" dataKey="car_name" tick={{ fontSize: 10 }} width={148}
                  tickFormatter={n => n.replace('Lower Mainland–', 'LM–').replace('Vancouver Island–', 'VI–').replace('Thompson–', 'T–')} />
                <Tooltip formatter={v => [`${Math.round(v).toLocaleString()} t`, 'Farm-Gate']} />
                <Bar dataKey="farmgate_t" radius={[0, 3, 3, 0]}
                  onMouseEnter={d => setHovered(d.uid)}
                  onMouseLeave={() => setHovered(null)}>
                  {carTotals.map((entry, i) => (
                    <Cell key={i}
                      fill={CAR_COLORS[entry.uid] || '#94a3b8'}
                      fillOpacity={hovered == null || hovered === entry.uid ? 0.85 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* All-year trend for all CARs */}
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '16px 20px 12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Provincial Trend 2010–2022</div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart
                data={Object.entries(
                  allCAR.reduce((acc, d) => {
                    if (!acc[d.year]) acc[d.year] = { year: d.year }
                    acc[d.year][d.car_uid || d.car_code] = (acc[d.year][d.car_uid || d.car_code] || 0) + (d.farmgate_t || 0)
                    return acc
                  }, {}
                )).map(([, v]) => v).sort((a, b) => a.year - b.year)}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v/1000)}k`} />
                <Tooltip formatter={(v, n) => [`${Math.round(v)} t`, n]} />
                {Object.entries(CAR_COLORS).map(([uid, color]) => (
                  <Line key={uid} type="monotone" dataKey={uid} stroke={color}
                    strokeWidth={hovered === uid ? 2.5 : 1.5}
                    strokeOpacity={hovered == null || hovered === uid ? 1 : 0.25}
                    dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, background: 'var(--surface2)', borderRadius: 8, padding: '10px 16px', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
        <strong>Source:</strong> Boundary file — Statistics Canada, Census Agricultural Region cartographic boundary (2021), cat. no. lcar000a21a_e. Area shares from Census of Agriculture 2011/2016/2021 linearly interpolated. Provincial production downscaled to CARs; four items use equal 1/8 split where no census area data is available.
      </div>
    </div>
  )
}
