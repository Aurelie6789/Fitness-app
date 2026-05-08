import { useState } from 'react'
import type { TabKey } from './components/TabBar'
import HomeScreen from './screens/HomeScreen'
import WeightScreen from './screens/WeightScreen'
import CoachScreen from './screens/CoachScreen'
import SportScreen from './screens/SportScreen'
import RepasScreen from './screens/RepasScreen'

export default function App() {
  const [tab, setTab] = useState<TabKey>('home')

  return (
    <>
      <div style={{ display: tab === 'home'   ? undefined : 'none' }}><HomeScreen   onNavigate={setTab} /></div>
      <div style={{ display: tab === 'weight' ? undefined : 'none' }}><WeightScreen onNavigate={setTab} /></div>
      <div style={{ display: tab === 'coach'  ? undefined : 'none' }}><CoachScreen  onNavigate={setTab} /></div>
      <div style={{ display: tab === 'sport'  ? undefined : 'none' }}><SportScreen  onNavigate={setTab} /></div>
      <div style={{ display: tab === 'meals'  ? undefined : 'none' }}><RepasScreen  onNavigate={setTab} /></div>
    </>
  )
}
