import { motion } from 'framer-motion'

interface InsightCardProps {
  insight: string
  index: number
}

const INSIGHT_ICONS = ['💡', '📊', '⏱', '🎯', '📈', '🧠']
const INSIGHT_COLORS = [
  'bg-violet-50 border-violet-100',
  'bg-blue-50 border-blue-100',
  'bg-emerald-50 border-emerald-100',
  'bg-amber-50 border-amber-100',
  'bg-rose-50 border-rose-100',
  'bg-indigo-50 border-indigo-100',
]

const InsightCard = ({ insight, index }: InsightCardProps) => {
  const icon  = INSIGHT_ICONS[index % INSIGHT_ICONS.length]
  const color = INSIGHT_COLORS[index % INSIGHT_COLORS.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.24 }}
      className={`flex gap-3 p-4 rounded-2xl border ${color} transition-all cursor-default`}
    >
      <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed font-medium pt-1">{insight}</p>
    </motion.div>
  )
}

export default InsightCard
