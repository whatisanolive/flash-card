import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage.js'

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches

export function useTheme() {
  const [theme, setTheme] = useLocalStorage('recall.theme', () => (prefersDark() ? 'dark' : 'light'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggle }
}
