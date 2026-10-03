import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import './App.css'

// Code-splitting: every page except the landing one is its own chunk,
// downloaded only when the user first navigates there.
const DeckDetailPage = lazy(() => import('./pages/DeckDetailPage.jsx'))
const DeckFormPage = lazy(() => import('./pages/DeckFormPage.jsx'))
const StudyPage = lazy(() => import('./pages/StudyPage.jsx'))
const StatsPage = lazy(() => import('./pages/StatsPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="decks/new" element={<DeckFormPage />} />
        <Route path="decks/:deckId" element={<DeckDetailPage />} />
        <Route path="decks/:deckId/edit" element={<DeckFormPage />} />
        <Route path="decks/:deckId/study" element={<StudyPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
