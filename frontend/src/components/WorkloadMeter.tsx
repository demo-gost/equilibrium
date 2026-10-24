import { motion } from 'framer-motion'

interface WorkloadMeterProps {
  plannedHours: number
  limitHours: number
  vibeScore?: number
}

const getWorkloadStatus = (ratio: number) => {
  if (ratio < 0.5)  return { label: 'Light',    color: '#22c55e', bar: 'from-emerald-400 to-emerald-500',  bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (ratio < 0.75) return { label: 'Balanced', color: '#6c63ff', bar: 'from-violet-400 to-indigo-500',   bg: 'bg-violet-50 text-violet-700 border-violet-200' }
  if (ratio < 0.9)  return { label: 'Heavy',    color: '#f59e0b', bar: 'from-amber-400 to-orange-400',    bg: 'bg-amber-50 text-amber-700 border-amber-200' }
  return               { label: 'At Limit', color: '#ef4444', bar: 'from-red-400 to-rose-500',       bg: 'bg-red-50 text-red-700 border-red-200' }
}

const VIBE_EMOJIS = ['😊', '🙂', '😐', '😓', '😰']

const WorkloadMeter = ({ plannedHours, limitHours, vibeScore }: WorkloadMeterProps) => {
  const ratio  = Math.min(plannedHours / limitHours, 1)
  const status = getWorkloadStatus(ratio)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Today's Workload</div>
          <div className="text-xl font-bold text-text-primary leading-tight">
            {plannedHours.toFixed(1)}
            <span className="text-text-muted text-sm font-medium">/{limitHours}h</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${status.bg}`}>
            {status.label}
          </span>
          {vibeScore !== undefined && (
            <div className="text-xs text-text-muted font-medium">
              Feeling {VIBE_EMOJIS[vibeScore - 1] || '—'}
            </div>
          )}
        </div>
      </div>

      <div className="w-full bg-bg-primary rounded-full h-2.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${status.bar}`}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] font-semibold text-text-muted">0h</span>
        <span className="text-[10px] font-semibold text-text-muted">{limitHours}h</span>
      </div>
    </div>
  )
}

export default WorkloadMeter
