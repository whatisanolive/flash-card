import { useEffect, useRef } from 'react'

// useKeyboard({ ' ': flip, '1': again, Escape: exit }, enabled)
// Ignores keys typed into inputs so shortcuts never hijack a form.
export function useKeyboard(bindings, enabled = true) {
  const ref = useRef(bindings)
  ref.current = bindings // always call the latest handlers without re-subscribing

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Space/Enter on a focused button or link should keep their native "click".
      if ((e.key === ' ' || e.key === 'Enter') && e.target?.closest?.('button, a')) return
      const handler = ref.current[e.key]
      if (handler) {
        e.preventDefault()
        handler(e)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
