import { useState } from 'react'

function Tip({ label, tip, children }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ borderBottom: '1px dashed #6b7280', cursor: 'help', color: 'inherit' }}
      >
        {children || label}
      </span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '125%', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#f1f5f9', fontSize: 12, borderRadius: 7,
          padding: '8px 12px', whiteSpace: 'normal', minWidth: 200, maxWidth: 280,
          boxShadow: '0 4px 12px rgba(0,0,0,.25)', zIndex: 9999, lineHeight: 1.5,
          pointerEvents: 'none',
        }}>
          {tip}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: 5, borderStyle: 'solid', borderColor: '#1e293b transparent transparent transparent' }} />
        </span>
      )}
    </span>
  )
}

const Section = ({ icon, title, children }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f4c81' }}>{title}</div>
    </div>
    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, paddingLeft: 26 }}>
      {children}
    </div>
  </div>
)

export default function AboutModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, width: 460, maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)', padding: '28px 28px 24px',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>About This Tool</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Greater Vancouver Food Bank · BC Produce Surplus Estimates</div>
          </div>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '4px 10px',
            fontSize: 18, cursor: 'pointer', color: '#6b7280', lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 20 }} />

        <Section icon="🥦" title="What does this tool do?">
          Every year, a large share of BC's fresh produce never reaches anyone's plate. This tool
          estimates how much of that surplus could be recovered. And puts it in human terms:
          how many people could eat for a year if that food were redirected.
          <br /><br />
          It covers <strong>40 fruits and vegetables</strong> consumed in BC, from 2010 to 2025. It includes
          BC-grown crops, estimated interprovincial shipments arriving in BC, and international imports
          circulating in BC's supply chain.
        </Section>

        <Section icon="🚜" title="What is upstream surplus?">
          This is food that was planted on BC farms but unharvested or rejected before
          entering the grocery supply chain — usually because of cosmetic imperfections (odd shape,
          blemishes, wrong size) or overproduction with no buyer. It combines BC StatsCan production
          data, production losses and postharvest handling losses into a single cascade estimate.
          <br /><br />
          This is the most actionable type of surplus for the GVFB: farmers can donate or
          sell it directly, and the GVFB's <em>Food Donation Tax Credit</em> program already procures
          roughly half its produce this way.
        </Section>

        <Section icon="🛒" title="What is downstream surplus?">
          This is food that enters the supply chain but is discarded during distribution and
          at the retail stage. This could be due to multiple reasons, such as overstocking or
          appearance standards at the store level.
          <br /><br />
          Downstream surplus uses a BC provincial mass balance that accounts for what BC actually
          imports and exports. Produce that passes through BC's supply chain but is grown elsewhere
          still counts as BC retail waste if it is discarded here.
        </Section>

        <Section icon="📐" title="How are the numbers estimated?">
          <strong>Upstream surplus</strong> uses a cascade model: 14.2% production loss + 8.7%
          postharvest loss applied to BC StatsCan harvested quantities.
          Loss rates are derived from literature and uses estimates from multiple studies. More information can be found here.
          <br /><br />
          <strong>Downstream surplus</strong> uses a second cascade: 2.5% distribution + 5.8%
          retail, applied to BC's provincial retail supply.
          Retail supply is computed via a mass balance approach used by{' '}
          <a href="https://canadafoodflows.ca/" target="_blank" rel="noopener noreferrer"
            style={{ color: '#0f4c81', textDecoration: 'underline' }}>Canada's Food Flow</a> tool:
          <br /><br />
          <em>BC production − upstream surplus + international imports into BC + interprovincial inflows − exports out of BC − interprovincial outflows</em>
          <br /><br />
          Interprovincial flows are not directly observed, they are estimated using
          Inverse Distance Weighting (IDW), allocating surplus from supply provinces to deficit
          provinces proportional to road proximity.
        </Section>

        <Section icon="👤" title="What does 'people fed' mean?">
          Canada's Food Guide recommends eating 7 servings of vegetables and fruit per day. At
          roughly 80 g per serving, that's 204 kg per person per year.
          <br /><br />
          Dividing the total surplus by 204 kg gives the number of people whose full-year produce
          needs could theoretically be met. It doesn't account for sorting, transport, or cold-chain
          losses involved in actual food recovery.
        </Section>

        <Section icon="🌾" title="What is the Farm Gate Procured tab?">
          The <strong>Farm Gate Procured</strong> tab shows what GVFB has actually collected from BC farms
          through the <em>Food Donation Tax Credit</em> program and others, and compares it to the
          estimated available surplus for each crop. This data comes from GVFB's internal farm
          procurement database.
        </Section>

        <Section icon="📦" title="Where does the data come from?">
          <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
            <li><strong>Production:</strong> Statistics Canada (fruits, vegetables, greenhouse, potatoes)</li>
            <li><strong>Trade:</strong> Canada International Merchandise Trade — provincial imports/exports</li>
            <li><strong>Consumption:</strong> FAOSTAT national food supply accounts for Canada</li>
            <li><strong>Loss rates:</strong> Based on seven studies identified by GVFB staff and three self-reports from existing GVFB farm donors</li>
            <li><strong>Regional boundaries:</strong> Statistics Canada Census Agricultural Region file (2021)</li>
            <li><strong>Seasonal patterns:</strong> GVFB Farm-to-Community donation data; BC Ministry of Agriculture harvest calendars</li>
            <li><strong>Farm Gate Procured:</strong> GVFB internal FTC inbound database (Feb 2024 – Mar 2026), product names harmonised to Statistics Canada categories</li>
          </ul>
        </Section>

        <Section icon="⚠️" title="Things to keep in mind">
          <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
            <li><strong>Loss rates:</strong> same loss rates are applied to all fruits and vegetables. We acknowledge that loss rates should vary by perishability of the produce, highly perishable produce typically have higher loss factors than hardy produce. We found too few category-specific observations to justify a separate loss factor for fruit and vegetables (let alone, product-specific loss factors). While it is implied in <em>The Avoidable Crisis of Food Waste: Update</em> (Second Harvest / VCMI, 2024) that the authors developed product or subcategory level loss factors from extensive interviews and focus groups, they have declined to share such information.</li>
            <li>2024–2025 production is <strong>preliminary</strong> (subject to revision by StatsCan)</li>
            <li>2024–2025 consumption is <strong>extrapolated</strong> at 2023 per-capita levels (FAOSTAT covers 2010–2023 actual)</li>
            <li>Interprovincial trade flows are <strong>modelled</strong></li>
            <li>Downstream surplus reflects <strong>all food wasted within BC's retail system</strong>, including imported produce and not just BC-grown food</li>
          </ul>
        </Section>

        <div style={{ paddingTop: 16, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
          Last updated July 2026
        </div>
      </div>
    </div>
  )
}
