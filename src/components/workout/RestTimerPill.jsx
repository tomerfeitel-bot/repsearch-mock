import { useEffect, useState } from 'react'

const PRESETS = [60, 90, 120, 180]

export default function RestTimerPill({ active, durationSec = 90, startedAt = 0, stacked = false, onRestart, onDismiss }) {
  const [remaining, setRemaining] = useState(durationSec)
  const [flashed, setFlashed] = useState(false)

  useEffect(() => {
    if (!active) {
      setRemaining(durationSec)
      setFlashed(false)
      return
    }

    const started = startedAt || Date.now()
    setFlashed(false)
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      const left = durationSec - elapsed
      setRemaining(left)
      if (left <= 0) {
        clearInterval(id)
        if (navigator.vibrate) {
          try {
            navigator.vibrate([80, 60, 120])
          } catch {
            // Vibration can be blocked by the browser or device settings.
          }
        }
        setFlashed(true)
        setTimeout(() => onDismiss?.(), 2000)
      }
    }, 250)
    return () => clearInterval(id)
  }, [active, durationSec, startedAt, onDismiss])

  if (!active) return null

  const done = remaining <= 0
  const label = formatRest(Math.max(0, remaining))

  return (
    <div className={(stacked ? 'bottom-[calc(env(safe-area-inset-bottom)+8rem)]' : 'bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]') + ' fixed left-0 right-0 z-50 flex justify-center pointer-events-none px-3'}>
      <div
        className={
          'pointer-events-auto w-full max-w-md rounded-2xl border p-2 shadow-lg transition-all ' +
          (done
            ? 'bg-indigo-500 text-white border-indigo-300 ' + (flashed ? 'animate-pulse' : '')
            : 'bg-gray-900/95 backdrop-blur text-indigo-300 border-indigo-700/60')
        }
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRestart?.(Math.max(15, durationSec - 15))}
            className="h-9 rounded-xl bg-gray-950/60 px-3 text-xs font-semibold text-gray-300 hover:text-gray-100"
          >
            -15s
          </button>
          <button
            type="button"
            onClick={() => onRestart?.(durationSec)}
            className="min-w-0 flex-1 rounded-xl bg-gray-950/40 px-3 py-2 text-center text-sm font-semibold"
          >
            <span className="font-mono tabular-nums">{done ? 'Rest complete' : `Rest ${label}`}</span>
          </button>
          <button
            type="button"
            onClick={() => onRestart?.(Math.min(600, durationSec + 15))}
            className="h-9 rounded-xl bg-gray-950/60 px-3 text-xs font-semibold text-gray-300 hover:text-gray-100"
          >
            +15s
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1">
          {PRESETS.map(seconds => (
            <button
              key={seconds}
              type="button"
              onClick={() => onRestart?.(seconds)}
              className="flex-1 rounded-lg bg-gray-950/40 px-2 py-1 text-[11px] font-semibold text-gray-300 hover:text-gray-100"
            >
              {formatRest(seconds)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onRestart?.(durationSec)}
            className="rounded-lg bg-gray-950/40 px-2 py-1 text-[11px] font-semibold text-gray-300 hover:text-gray-100"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg bg-gray-950/40 px-2 py-1 text-[11px] font-semibold text-gray-300 hover:text-gray-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

function formatRest(seconds) {
  const n = Number(seconds) || 0
  const m = Math.floor(n / 60)
  const s = n % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
