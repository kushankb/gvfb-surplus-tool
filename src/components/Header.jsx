import { Info } from 'lucide-react'
import gvfbLogo from '../assets/gvfb-logo.png'

export default function Header({ onAbout }) {
  return (
    <header style={{
      background: 'linear-gradient(135deg, #0f4c81 0%, #1d6fa4 60%, #1a8a6b 100%)',
      padding: '12px 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* GVFB logo — white reversed version */}
        <img
          src={gvfbLogo}
          alt="Greater Vancouver Food Bank"
          style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
        <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.25)' }} />
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.2px' }}>
            BC Produce Surplus Tool
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 }}>
            Farm-gate &amp; Retail Surplus Estimates · British Columbia · 2010–2025
          </div>
        </div>
      </div>

      <button onClick={onAbout} style={{
        background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px',
        color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500,
        border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, transition: 'background .15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >
        <Info size={14} /> About this tool
      </button>
    </header>
  )
}
