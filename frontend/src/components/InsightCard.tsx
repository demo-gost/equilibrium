import { motion } from 'framer-motion'

interface InsightCardProps {
  insight: string
  index: number
}

const INSIGHT_ICONS = ['🤖', '📊', '⏱', '💡', '🎯', '📈']

const InsightCard = ({ insight, index }: InsightCardProps) => {
  const icon = INSIGHT_ICONS[index % INSIGHT_ICONS.length]

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex gap-3 p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10 hover:border-brand-primary/20 transition-all"
    >
      <span className="text-xl shrink-0">{icon}</span>
      <p className="text-sm text-text-secondary leading-relaxed">{insight}</p>
    </motion.div>
  )
}

export default InsightCard
