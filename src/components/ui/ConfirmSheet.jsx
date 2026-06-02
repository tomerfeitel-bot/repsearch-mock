export function ConfirmSheet({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="w-10 h-1 rounded-full bg-gray-700 absolute top-2 left-1/2 -translate-x-1/2" />
        <div className="px-4 pt-5 pb-3 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white text-center">{title}</h2>
        </div>
        <div className="p-4 space-y-4">
          {message && <p className="text-sm text-gray-400">{message}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-3.5 text-sm font-semibold text-gray-300 active:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={
                'rounded-xl px-3 py-3.5 text-sm font-semibold text-white active:opacity-80 ' +
                (danger ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500')
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
