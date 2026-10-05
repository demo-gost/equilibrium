import { useState } from 'react'
import { IonModal } from '@ionic/react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type WorkloadRating = 'too_light' | 'balanced' | 'heavy' | 'too_heavy'

const WORKLOAD_OPTIONS: { value: WorkloadRating; label: string; emoji: string }[] = [
  { value: 'too_light', label: 'Too Light', emoji: '😴' },
  { value: 'balanced',  label: 'Balanced',  emoji: '😊' },
  { value: 'heavy',     label: 'Heavy',     emoji: '😓' },
  { value: 'too_heavy', label: 'Too Heavy', emoji: '🥵' },
]

const VIBE_OPTIONS = [
  { score: 1, emoji: '😊', label: 'Great' },
  { score: 2, emoji: '🙂', label: 'Good' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '😓', label: 'Tired' },
  { score: 5, emoji: '😰', label: 'Stressed' },
]

const FeedbackModal = ({ isOpen, onClose }: Props) => {
  const [vibeScore, setVibeScore] = useState<number>(2)
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

  const handleClose = () => {
    setSubmitted(false)
    onClose()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
      <div className="bg-bg-secondary min-h-screen px-4 pt-8 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight">Vibe Check</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary transition-all"
          >
            ✕
          </button>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-14"
            >
              <div className="text-6xl mb-5">🎉</div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">Thanks!</h3>
              <p className="text-text-muted text-sm mb-8 max-w-xs">
                Equilibrium will use this feedback to improve your schedule.
              </p>
              <button onClick={handleClose} className="btn-primary px-10">Done</button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Vibe score */}
              <div>
                <h3 className="font-semibold text-text-primary mb-1">How are you feeling?</h3>
                <p className="text-xs text-text-muted mb-4">1 = Great, 5 = Very stressed</p>
                <div className="grid grid-cols-5 gap-2">
                  {VIBE_OPTIONS.map(({ score, emoji, label }) => (
                    <button
                      key={score}
                      onClick={() => setVibeScore(score)}
                      className={`flex flex-col items-center py-3 rounded-2xl transition-all border
                        ${vibeScore === score
                          ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary'
                          : 'bg-white/4 border-white/8 text-text-secondary hover:bg-white/8'}`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-[10px] font-medium mt-1">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Workload */}
              <div>
                <h3 className="font-semibold text-text-primary mb-4">How does today's workload feel?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {WORKLOAD_OPTIONS.map(({ value, label, emoji }) => (
                    <button
                      key={value}
                      onClick={() => setWorkloadRating(value)}
                      className={`p-4 rounded-2xl transition-all text-left border
                        ${workloadRating === value
                          ? 'border-brand-primary/40 bg-brand-primary/10'
                          : 'border-white/8 bg-white/4 hover:bg-white/7'}`}
                    >
                      <div className="text-2xl mb-1.5">{emoji}</div>
                      <div className={`font-medium text-sm ${workloadRating === value ? 'text-brand-primary' : 'text-text-secondary'}`}>
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
                {mutation.isPending && (
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                )}
                {mutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </IonModal>
  )
}

export default FeedbackModal
