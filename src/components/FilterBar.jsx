import summaryData from '../data/summary.json'

const TABS = [
  { id: 'executive', label: 'Overview' },
  { id: 'regions',   label: 'Regions & Seasons' },
  { id: 'produce',   label: 'By Produce' },
  { id: 'ftc',       label: 'Farm Gate Procured' },
]

const SURPLUS_TYPES = [
  { id: 'farmgate', label: 'Upstream' },
  { id: 'retail',   label: 'Downstream' },
  { id: 'total',    label: 'Total Recoverable' },
]

const FLAG_ICONS = { partial: '◑', extrapolated: '~', preliminary: '⚠' }
const flagByYear = Object.fromEntries(summaryData.map(d => [d.year, d.flag]))

export default function FilterBar({
  year, setYear, item, setItem, surplusType, setSurplusType,
  years, items, activeTab, setActiveTab
}) {
  const chip = (active, id) => {
    const color = id === 'farmgate' ? 'var(--upstream)' : id === 'retail' ? 'var(--downstream)' : 'var(--harvest)'
    const shadow = id === 'farmgate' ? 'rgba(23,74,103,.25)' : id === 'retail' ? 'rgba(233,138,58,.25)' : 'rgba(233,138,58,.25)'
    return {
      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
      border: '1px solid', cursor: 'pointer', transition: 'all .15s',
      background: active ? color : 'var(--surface)',
      color: active ? '#fff' : 'var(--text-secondary)',
      borderColor: active ? color : 'var(--border)',
      boxShadow: active ? `0 1px 4px ${shadow}` : 'none',
    }
  }

  const sel = {
    padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--surface)', fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', cursor: 'pointer',
  }

  const currentFlag = flagByYear[year]
  const flagMeta = summaryData.find(d => d.year === year)

  const FLAG_BANNER = {
    partial:      { bg: '#fefce8', border: '#fde68a', text: '#713f12' },
    extrapolated: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    preliminary:  { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  }

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 61, zIndex: 99, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {currentFlag && (
        <div style={{
          padding: '7px 24px', fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          background: FLAG_BANNER[currentFlag].bg,
          borderBottom: `1px solid ${FLAG_BANNER[currentFlag].border}`,
          color: FLAG_BANNER[currentFlag].text,
        }}>
          <span style={{ fontSize: 14 }}>{FLAG_ICONS[currentFlag]}</span>
          <strong>{year}:</strong> {flagMeta?.flag_note}
        </div>
      )}

      <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, minHeight: 56 }}>
        <div style={{ display: 'flex', gap: 0, borderRight: '1px solid var(--border)', paddingRight: 16, marginRight: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '18px 16px', fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? 'var(--upstream)' : 'var(--text-secondary)',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === t.id ? 'var(--upstream)' : 'transparent'}`,
              transition: 'all .15s', whiteSpace: 'nowrap',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 0' }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={sel}>
            {years.map(y => {
              const f = flagByYear[y]
              return <option key={y} value={y}>{y}{f ? ` ${FLAG_ICONS[f]}` : ''}</option>
            })}
          </select>

          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Produce</label>
          <select value={item} onChange={e => setItem(e.target.value)} style={sel}>
            <option value="All">All produce</option>
            {items.map(i => <option key={i} value={i}>{i}</option>)}
          </select>

          {activeTab === 'produce' && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
              {SURPLUS_TYPES.map(st => (
                <button key={st.id} onClick={() => setSurplusType(st.id)} style={chip(surplusType === st.id, st.id)}>
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


    </div>
  )
}
