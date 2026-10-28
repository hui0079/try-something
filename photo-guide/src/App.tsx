import { useState } from 'react'
import { GearPage } from './ui/GearPage.tsx'
import { GuideFlow } from './ui/GuideFlow.tsx'
import { ScorePage } from './ui/ScorePage.tsx'

type Tab = 'guide' | 'score' | 'gear'

const TABS: { id: Tab; label: string }[] = [
  { id: 'guide', label: '查参数' },
  { id: 'score', label: '评照片' },
  { id: 'gear', label: '器材' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('guide')

  return (
    <div className="stage">
      <div className="phone">
        <header className="top">
          <p className="brand">取景</p>
          <h1>{TABS.find((item) => item.id === tab)?.label}</h1>
        </header>
        <main>
          <section className={tab === 'guide' ? 'panel' : 'panel is-hidden'}>
            <GuideFlow />
          </section>
          <section className={tab === 'score' ? 'panel' : 'panel is-hidden'}>
            <ScorePage />
          </section>
          <section className={tab === 'gear' ? 'panel' : 'panel is-hidden'}>
            <GearPage />
          </section>
        </main>
        <nav className="tabs" aria-label="主导航">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === tab ? 'tab is-selected' : 'tab'}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
