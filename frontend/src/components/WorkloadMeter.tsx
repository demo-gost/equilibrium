import { motion } from 'framer-motion'

interface WorkloadMeterProps {
  plannedHours: number
  limitHours: number
  vibeScore?: number
}

const getWorkloadStatus = (ratio: number) => {
  if (ratio < 0.5) return { label: 'Light', color: 'text-status-success', bar: 'bg-status-success' }
  if (ratio < 0.75) return { label: 'Balanced', color: 'text-brand-accent', bar: 'bg-brand-accent' }
  if (ratio < 0.9) return { label: 'Heavy', color: 'text-status-warning', bar: 'bg-status-warning' }
  return { label: 'At Limit', color: 'text-status-error', bar: 'bg-status-error' }
}

const WorkloadMeter = ({ plannedHours, limitHours, vibeScore }: WorkloadMeterProps) => {
  const ratio = Math.min(plannedHours / limitHours, 1)
  const status = getWorkloadStatus(ratio)

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">Today's Workload</div>
          <div className={`text-xs font-medium ${status.color}`}>{status.label}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-text-primary">
            {plannedHours.toFixed(1)}<span className="text-text-muted text-sm font-normal">/{limitHours}h</span>
          </div>
          {vibeScore !== undefined && (
            <div className="text-xs text-text-muted">
              Vibe: {['😊', '🙂', '😐', '😓', '😰'][vibeScore - 1]}
            </div>
          )}
        </div>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${status.bar}`}
        />
      </div>
    </div>
  )
}

export default WorkloadMeter
