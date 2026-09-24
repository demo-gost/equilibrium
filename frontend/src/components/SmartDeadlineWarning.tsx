import { motion } from 'framer-motion';

interface Props {
  category: string;
  historicalErrorPercent?: number;
}

export const SmartDeadlineWarning = ({ category, historicalErrorPercent = 0 }: Props) => {
  // Only show warning if historical underestimation error is > 15%
  if (historicalErrorPercent <= 15) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-status-warning/15 border border-status-warning/30 p-3 rounded-xl text-xs text-status-warning flex items-start gap-2.5 my-3 shadow-sm"
    >
      <span className="text-base shrink-0">⚠️</span>
      <div>
        <span className="font-bold">Smart AI Underestimation Warning:</span>
        <p className="mt-0.5 opacity-90 leading-relaxed">
          Based on your historical study data, you tend to underestimate{' '}
          <strong className="capitalize">{category}</strong> tasks by{' '}
          <strong>{Math.round(historicalErrorPercent)}%</strong>. Equilibrium has automatically added buffer time to protect your schedule.
        </p>
      </div>
    </motion.div>
  );
};
