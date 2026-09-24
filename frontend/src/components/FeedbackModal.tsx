import { useState } from 'react'
import { IonModal } from '@ionic/react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type WorkloadRating = 'too_light' | 'balanced' | 'heavy' | 'too_heavy'

const WORKLOAD_OPTIONS: { value: WorkloadRating; label: string; emoji: string; color: string }[] = [
  { value: 'too_light', label: 'Too Light', emoji: '😴', color: 'text-blue-400' },
  { value: 'balanced', label: 'Balanced', emoji: '😊', color: 'text-status-success' },
  { value: 'heavy', label: 'Heavy', emoji: '😓', color: 'text-status-warning' },
  { value: 'too_heavy', label: 'Too Heavy', emoji: '🥵', color: 'text-status-error' },
]

const FeedbackModal = ({ isOpen, onClose }: Props) => {
  const [vibeScore, setVibeScore] = useState<number>(3)
  const [workloadRating, setWorkloadRating] = useState<WorkloadRating>('balanced')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        api.post('/analytics/feedback', { type: 'VIBE_CHECK', vibeScore }),
        api.post('/analytics/feedback', { type: 'WORKLOAD_FEEDBACK', workloadRating }),
      ])
    },
    onSuccess: () => setSubmitted(true),
  })

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <div className="bg-bg-secondary min-h-screen px-4 pt-8 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">How are you doing? 😊</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-2">✕</button>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Thanks for the feedback!</h3>
            <p className="text-text-muted text-sm mb-6">Equilibrium will use this to improve your schedule.</p>
            <button onClick={onClose} className="btn-primary">Done</button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Vibe Check */}
            <div>
              <h3 className="font-semibold text-text-primary mb-2">How overwhelmed do you feel this week?</h3>
              <p className="text-xs text-text-muted mb-4">1 = Not at all, 5 = Extremely</p>
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => setVibeScore(score)}
                    className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all
                      ${vibeScore === score
                        ? 'bg-brand-primary text-white shadow-glow'
                        : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                  >
                    {['😊', '🙂', '😐', '😓', '😰'][score - 1]}
                    <div className="text-xs font-normal mt-1">{score}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Workload */}
            <div>
              <h3 className="font-semibold text-text-primary mb-4">How does today's workload feel?</h3>
              <div className="grid grid-cols-2 gap-3">
                {WORKLOAD_OPTIONS.map(({ value, label, emoji, color }) => (
                  <button
                    key={value}
                    onClick={() => setWorkloadRating(value)}
                    className={`p-4 rounded-xl transition-all text-left border
                      ${workloadRating === value
                        ? 'border-brand-primary bg-brand-primary/10'
                        : 'border-white/5 bg-white/3 hover:bg-white/8'}`}
                  >
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className={`font-medium text-sm ${workloadRating === value ? 'text-brand-primary' : color}`}>
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              id="submit-feedback-btn"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="btn-primary w-full"
            >
              {mutation.isPending ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : null}
              {mutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        )}
      </div>
    </IonModal>
  )
}

export default FeedbackModal
