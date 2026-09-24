import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import type { ScheduleBlock, Task } from '../types'

interface Props {
  block: ScheduleBlock
  onAction: () => void
}

const TaskQuickActions = ({ block, onAction }: Props) => {
  const qc = useQueryClient()
  const [showExtend, setShowExtend] = useState(false)
  const task = block.taskId as Task | undefined

  const extendMutation = useMutation({
    mutationFn: (mins: number) => task
      ? api.post(`/tasks/${task._id}/extend`, { extensionMinutes: mins })
      : Promise.reject('No task'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['schedule-today'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setShowExtend(false)
      onAction()
    },
  })

  if (!task || block.status !== 'scheduled') return null

  return (
    <div className="flex items-center gap-2 mt-3">
      <button
        onClick={() => setShowExtend(!showExtend)}
        className="text-xs bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary px-3 py-1.5 rounded-lg transition-all"
      >
        ⏱ Extend
      </button>

      <AnimatePresence>
        {showExtend && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex gap-1.5"
          >
            {[15, 30, 60].map((m) => (
              <button
                key={m}
                onClick={() => extendMutation.mutate(m)}
                disabled={extendMutation.isPending}
                className="text-xs bg-white/5 hover:bg-brand-primary/20 text-text-secondary hover:text-brand-primary px-2.5 py-1.5 rounded-lg transition-all border border-white/5"
              >
                +{m}m
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TaskQuickActions
