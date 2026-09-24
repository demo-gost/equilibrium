import { useState } from 'react'
import { IonModal } from '@ionic/react'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import type { Task } from '../types'

interface Props {
  task: Task
  onClose: () => void
  onCompleted: () => void
}

const CompleteTaskModal = ({ task, onClose, onCompleted }: Props) => {
  const [actualMinutes, setActualMinutes] = useState(task.estimatedDurationMinutes)
  const [difficultyRating, setDifficultyRating] = useState<number>(3)

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

  const DIFF_LABELS = ['', 'Easy 😊', 'Medium 🙂', 'Hard 😤', 'Very Hard 🥵']

  return (
    <IonModal isOpen={true} onDidDismiss={onClose}>
      <div className="bg-bg-secondary min-h-screen px-4 pt-8 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">Complete Task</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-2">✕</button>
        </div>

        <div className="glass-card p-4 mb-6">
          <div className="font-bold text-text-primary text-lg mb-1">{task.title}</div>
          <div className="text-text-muted text-sm capitalize">{task.category}</div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="label-text">Actual time taken: <span className="text-brand-primary">{actualMinutes} min</span></label>
            <input
              type="range" min={5} max={600} step={5} value={actualMinutes}
              onChange={(e) => setActualMinutes(+e.target.value)}
              className="w-full mt-2 accent-indigo-500"
            />
            {task.estimatedDurationMinutes && (
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>5 min</span>
                <span className="text-brand-accent">Est: {task.estimatedDurationMinutes}min</span>
                <span>10h</span>
              </div>
            )}
            {actualMinutes !== task.estimatedDurationMinutes && (
              <div className={`text-xs mt-2 ${actualMinutes > task.estimatedDurationMinutes ? 'text-status-warning' : 'text-status-success'}`}>
                {actualMinutes > task.estimatedDurationMinutes
                  ? `⚠️ Took ${actualMinutes - task.estimatedDurationMinutes}min longer than estimated`
                  : `✓ Finished ${task.estimatedDurationMinutes - actualMinutes}min early!`}
              </div>
            )}
          </div>

          <div>
            <label className="label-text mb-3 block">How difficult was it?</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficultyRating(d)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all
                    ${difficultyRating === d
                      ? 'bg-brand-primary text-white'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                >
                  {DIFF_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            id="confirm-complete-btn"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary flex-1"
          >
            {mutation.isPending ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : '✓'}
            {mutation.isPending ? 'Saving...' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </IonModal>
  )
}

export default CompleteTaskModal
