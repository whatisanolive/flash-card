import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Promise-based confirm dialog that replaces window.confirm:
//   const confirm = useConfirm()
//   if (await confirm({ title, message, confirmLabel: 'Delete', danger: true })) { … }

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)
  const confirmBtn = useRef(null)

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setDialog(options)
      }),
    [],
  )

  const close = useCallback((result) => {
    resolver.current?.(result)
    resolver.current = null
    setDialog(null)
  }, [])

  useEffect(() => {
    if (!dialog) return
    const previouslyFocused = document.activeElement
    confirmBtn.current?.focus()
    const onKey = (e) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [dialog, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal-backdrop" onClick={() => close(false)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title">{dialog.title}</h2>
            {dialog.message && <p id="confirm-message">{dialog.message}</p>}
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => close(false)}>
                Cancel
              </button>
              <button
                ref={confirmBtn}
                className={`btn ${dialog.danger ? 'btn--danger' : 'btn--primary'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}
