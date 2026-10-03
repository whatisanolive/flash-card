import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import ServerStatus from '../components/ServerStatus.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'
import { Spinner } from '../components/Feedback.jsx'

export default function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <ServerStatus />
      <main id="main" className="app__main">
        {/* key: navigating away from a crashed page clears the error */}
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="app__footer">Recall · Digital Flashcard Learning App · Built with React, Express &amp; Prisma</footer>
    </div>
  )
}
