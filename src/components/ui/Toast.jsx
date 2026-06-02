import { useState, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed safe-top-4 left-0 right-0 flex flex-col items-center gap-2 z-[100] pointer-events-none px-4">
        {toasts.map(t => (
          <div key={t.id} className={'px-4 py-3 rounded-xl text-sm font-medium shadow-lg max-w-sm w-full text-center ' + (t.type === 'success' ? 'bg-green-900/90 border border-green-700 text-green-100' : t.type === 'error' ? 'bg-red-900/90 border border-red-700 text-red-100' : 'bg-gray-800/90 border border-gray-700 text-white')}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
