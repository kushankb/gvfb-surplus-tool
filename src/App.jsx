import { useState, useMemo } from 'react'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import ExecutiveSummary from './components/ExecutiveSummary'
import FarmRegionsView from './components/FarmRegionsView'
import ProduceExplorer from './components/ProduceExplorer'
import AboutModal from './components/AboutModal'
import summaryData from './data/summary.json'
import byItemData from './data/byItem.json'
import monthlyData from './data/monthly.json'
import byCARData from './data/byCAR.json'
import byCARItemData from './data/byCARItem.json'

const ITEMS = [...new Set(byItemData.map(d => d.item))].sort()
const YEARS = [...new Set(summaryData.map(d => d.year))].sort()

export default function App() {
  const [year, setYear]           = useState(2022)
  const [item, setItem]           = useState('All')
  const [surplusType, setSurplusType] = useState('total')
  const [activeTab, setActiveTab] = useState('executive')
  const [showAbout, setShowAbout] = useState(false)

  const yearSummary = useMemo(() =>
    summaryData.find(d => d.year === year) || summaryData[summaryData.length - 1], [year])

  const filteredItems = useMemo(() =>
    byItemData.filter(d => d.year === year && (item === 'All' || d.item === item)), [year, item])

  const filteredMonthly = useMemo(() =>
    monthlyData.filter(d => d.year === year && (item === 'All' || d.item === item)), [year, item])

  const filteredCAR = useMemo(() =>
    byCARItemData.filter(d => d.year === year && (item === 'All' || d.item === item)), [year, item])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header onAbout={() => setShowAbout(true)} />
      <FilterBar
        year={year} setYear={setYear}
        item={item} setItem={setItem}
        surplusType={surplusType} setSurplusType={setSurplusType}
        years={YEARS} items={ITEMS}
        activeTab={activeTab} setActiveTab={setActiveTab}
      />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 60px' }}>
        {activeTab === 'executive' && (
          <ExecutiveSummary
            yearSummary={yearSummary} allYears={summaryData}
            year={year} filteredItems={filteredItems}
          />
        )}
        {activeTab === 'regions' && (
          <FarmRegionsView
            carData={filteredCAR}
            monthly={filteredMonthly}
            year={year} item={item}
          />
        )}
        {activeTab === 'produce' && (
          <ProduceExplorer
            items={filteredItems} allItems={byItemData}
            year={year} allYears={YEARS} surplusType={surplusType}
          />
        )}
      </main>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}
