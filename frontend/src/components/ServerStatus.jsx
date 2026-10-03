import { useEffect, useState } from 'react'
import { healthApi } from '../api/index.js'

// Pings /api/health on load; if the backend is down, shows a banner with a retry.
export default function ServerStatus() {
  const [down, setDown] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    healthApi
      .check(controller.signal)
      .then(() => setDown(false))
      .catch(() => !controller.signal.aborted && setDown(true))
    return () => controller.abort()
  }, [attempt])

  if (!down) return null
  return (
    <div className="server-banner" role="alert">
      <span>
        Can’t reach the Recall server. Start it with <code>npm run dev:backend</code>.
      </span>
      <button className="btn btn--ghost btn--sm" onClick={() => setAttempt((a) => a + 1)}>
        Retry
      </button>
    </div>
  )
}
