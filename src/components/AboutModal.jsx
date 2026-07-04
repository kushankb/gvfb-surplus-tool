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
          estimates how much of that surplus <em>could</em> be recovered — and puts it in human terms:
          how many people could eat for a year if that food were redirected.
          <br /><br />
          It covers <strong>26 fruits and vegetables</strong> grown or consumed in BC, from 2010 to 2025.
        </Section>

        <Section icon="🚜" title="What is farm-gate surplus?">
          This is food that was <em>successfully harvested on BC farms</em> but rejected before
          entering the grocery supply chain — usually because of cosmetic imperfections (odd shape,
          blemishes, wrong size) or overproduction with no buyer.
          <br /><br />
          This is the most actionable type of surplus for the GVFB: farmers can donate or
          sell it directly, and the GVFB's <em>Farm to Community</em> program already procures
          roughly half its produce this way.
        </Section>

        <Section icon="🛒" title="What is retail surplus?">
          This is food that enters the supply chain but is discarded at the <em>retail stage</em> —
          approaching best-before dates, overstocking, or appearance standards at the store level.
          <br /><br />
          It represents a broader system-wide picture but is harder to access directly through
          farm procurement programs.
        </Section>

        <Section icon="📐" title="How are the numbers estimated?">
          <strong>Farm-gate surplus</strong> = how much BC farms harvested × the fraction typically
          rejected at the farm, based on{' '}
          <Tip tip="Second Harvest's 2024 national food waste study, which surveyed farms across Canada to measure how much produce is lost at the farm gate for each crop type.">
            Second Harvest's 2024 food waste study
          </Tip>.
          For example, about 7% of blueberries and 5% of tomatoes are rejected at the farm level.
          <br /><br />
          <strong>Retail surplus</strong> = BC's total food supply (local production + imports −
          exports, adjusted for interprovincial flows) × retail loss rates from the same study.
          <br /><br />
          All figures carry a <Tip tip="Loss rates come from national surveys and may not perfectly match every BC farm or year. The actual surplus could be somewhat higher or lower.">±30% uncertainty</Tip>.
        </Section>

        <Section icon="👤" title="What does 'people fed' mean?">
          Canada's Food Guide recommends eating 7 servings of vegetables and fruit per day. At
          roughly 80 g per serving, that's{' '}
          <Tip tip="7 servings × 80 g × 365 days ≈ 204 kg per year. This is the Health Canada (2007) benchmark for adults aged 19–50.">
            204 kg per person per year
          </Tip>.
          <br /><br />
          Dividing the total surplus by 204 kg gives the number of people whose full-year produce
          needs could theoretically be met. It doesn't account for sorting, transport, or cold-chain
          losses involved in actual food recovery.
        </Section>

        <Section icon="🚜" title="What is the Farm Gate Procured tab?">
          The <strong>Farm Gate Procured</strong> tab shows what GVFB has actually collected from BC farms
          through its <em>Farm-to-Community (FTC)</em> program, and compares it to the estimated
          available surplus for each crop.
          <br /><br />
          This data comes from <strong>GVFB's internal farm procurement database</strong> — every
          inbound donation or purchase from a BC farm is logged by product, date, and weight (in pounds,
          displayed here in lbs). It covers <strong>February 2024 to March 2026</strong>.
          <br /><br />
          The <em>capture rate</em> — GVFB collected ÷ estimated surplus — shows how much of the
          potential surplus is currently being reached. A low rate doesn't mean GVFB is underperforming;
          much of the surplus is geographically dispersed or logistically difficult to access.
        </Section>

        <Section icon="📦" title="Where does the data come from?">
          <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
            <li><strong>Production:</strong> Statistics Canada (fruits, vegetables, greenhouse, potatoes)</li>
            <li><strong>Trade:</strong> Canada International Merchandise Trade — provincial imports/exports</li>
            <li><strong>Consumption:</strong> FAOSTAT national food supply accounts for Canada</li>
            <li><strong>Loss rates:</strong> Second Harvest, "The Avoidable Crisis of Food Waste Update" (2024)</li>
            <li><strong>Regional boundaries:</strong> Statistics Canada Census Agricultural Region file (2021)</li>
            <li><strong>Seasonal patterns:</strong> GVFB Farm-to-Community donation data; BC Ministry of Agriculture harvest calendars</li>
            <li><strong>Farm Gate Procured:</strong> GVFB internal FTC inbound database (Feb 2024 – Mar 2026) — product names harmonised to Statistics Canada categories</li>
          </ul>
        </Section>

        <Section icon="⚠️" title="Things to keep in mind">
          <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
            <li>Loss rates are national averages — BC-specific rates may differ</li>
            <li>2024–2025 production is <strong>preliminary</strong> (subject to revision)</li>
            <li>2023–2025 consumption is <strong>extrapolated</strong> at 2023 per-capita levels</li>
            <li>Interprovincial trade flows are modelled, not directly observed</li>
          </ul>
        </Section>

        <div style={{ paddingTop: 16, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
          Methodology: Kushank Bajaj · UBC IRES · Canada FoodSupplyRisks project
        </div>
      </div>
    </div>
  )
}
