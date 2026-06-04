import { Wheat, Info } from 'lucide-react'

export default function Header({ onAbout }) {
  return (
    <header style={{
      background: 'linear-gradient(135deg, #0f4c81 0%, #1d6fa4 60%, #1a8a6b 100%)',
      padding: '16px 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center' }}>
          <Wheat size={22} color="#fff" />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
            Greater Vancouver Food Bank Surplus Tool
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>
            British Columbia · Farm-gate &amp; Retail Surplus Estimates · 2010–2025
          </div>
        </div>
      </div>
      <button onClick={onAbout} style={{
        background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px',
        color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500,
        border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, transition: 'background .15s',
      }}
        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
      >
        <Info size={14} /> About this tool
      </button>
    </header>
  )
}
