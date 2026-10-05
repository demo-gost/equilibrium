import { useState } from 'react'
import { IonModal } from '@ionic/react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../lib/api'
import type { Task } from '../types'

interface Props {
  task: Task
  onClose: () => void
  onCompleted: () => void
}

const DIFF_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: 'Easy',      emoji: '😊' },
  2: { label: 'Medium',    emoji: '🙂' },
  3: { label: 'Hard',      emoji: '😤' },
  4: { label: 'Very Hard', emoji: '🥵' },
}

const CompleteTaskModal = ({ task, onClose, onCompleted }: Props) => {
  const [actualMinutes, setActualMinutes] = useState(task.estimatedDurationMinutes)
  const [difficultyRating, setDifficultyRating] = useState<number>(2)

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post(`/tasks/${task._id}/complete`, { actualDurationMinutes: actualMinutes })
      await api.post('/analytics/feedback', {
        taskId: task._id,
        type: 'DIFFICULTY_FEEDBACK',
        difficultyRating,
      })
    },
    onSuccess: onCompleted,
  })

  const diff = actualMinutes - task.estimatedDurationMinutes
  const isOver = diff > 0

  return (
    <IonModal isOpen={true} onDidDismiss={onClose}>
      <div className="bg-bg-secondary min-h-screen px-4 pt-8 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight">Complete Task</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary transition-all"
          >
            ✕
          </button>
        </div>

        {/* Task Info */}
        <div className="glass-card p-4 mb-6">
          <div className="font-semibold text-text-primary mb-0.5">{task.title}</div>
          <div className="text-text-muted text-sm capitalize">{task.category?.replace('_', ' ')}</div>
        </div>

        <div className="space-y-7">
          {/* Actual time */}
          <div>
            <label className="label-text">
              Actual time taken:{' '}
              <span className="text-brand-primary font-semibold">{actualMinutes} min</span>
            </label>
            <input
              type="range" min={5} max={600} step={5} value={actualMinutes}
              onChange={(e) => setActualMinutes(+e.target.value)}
              className="w-full mt-2.5 accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1.5">
              <span>5 min</span>
              <span className="text-brand-accent">Est. {task.estimatedDurationMinutes}min</span>
              <span>10h</span>
            </div>
            {diff !== 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-xs mt-2.5 px-3 py-2 rounded-xl flex items-center gap-2
                  ${isOver
                    ? 'bg-status-warning/8 text-status-warning border border-status-warning/20'
                    : 'bg-status-success/8 text-status-success border border-status-success/20'}`}
              >
                {isOver
                  ? `⚠️ Took ${diff}min longer than estimated`
                  : `✓ Finished ${Math.abs(diff)}min ahead of estimate!`}
              </motion.div>
            )}
          </div>

          {/* Difficulty */}
          <div>
            <label className="label-text mb-3 block">How difficult was it?</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficultyRating(d)}
                  className={`py-3 rounded-xl text-center transition-all border
                    ${difficultyRating === d
                      ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary'
                      : 'bg-white/4 border-white/8 text-text-secondary hover:bg-white/8'}`}
                >
                  <div className="text-xl mb-0.5">{DIFF_LABELS[d].emoji}</div>
                  <div className="text-[11px] font-medium leading-tight">{DIFF_LABELS[d].label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            id="confirm-complete-btn"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary flex-1"
          >
            {mutation.isPending && (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            )}
            {mutation.isPending ? 'Saving...' : '✓ Mark Complete'}
          </button>
        </div>
      </div>
    </IonModal>
  )
}

export default CompleteTaskModal
