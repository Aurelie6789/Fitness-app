import { useState } from 'react'
import type { TabKey } from './components/TabBar'
import HomeScreen from './screens/HomeScreen'
import WeightScreen from './screens/WeightScreen'
import CoachScreen from './screens/CoachScreen'
import SportScreen from './screens/SportScreen'
import RepasScreen from './screens/RepasScreen'

export default function App() {
  const [tab, setTab] = useState<TabKey>('home')

  switch (tab) {
    case 'weight': return <WeightScreen onNavigate={setTab} />
    case 'coach':  return <CoachScreen onNavigate={setTab} />
    case 'sport':  return <SportScreen onNavigate={setTab} />
    case 'meals':  return <RepasScreen onNavigate={setTab} />
    default:       return <HomeScreen onNavigate={setTab} />
  }
}
