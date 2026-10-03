import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Recall` : 'Recall — Digital Flashcard Learning App'
  }, [title])
}
