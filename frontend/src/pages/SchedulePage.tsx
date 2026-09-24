import { useState } from 'react'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, parseISO, addDays, startOfDay, endOfDay } from 'date-fns'
import api from '../lib/api'
import type { ScheduleBlock, Task } from '../types'

const blockConfig: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  TASK:     { bg: 'bg-brand-primary/15',  border: 'border-brand-primary/30',  icon: '📚', label: 'Task' },
  BREAK:    { bg: 'bg-status-success/10', border: 'border-status-success/20', icon: '☕', label: 'Break' },
  BUFFER:   { bg: 'bg-white/3',           border: 'border-white/8',           icon: '🔄', label: 'Buffer' },
  SLEEP:    { bg: 'bg-blue-900/15',       border: 'border-blue-500/20',       icon: '🌙', label: 'Sleep' },
  COLLEGE:  { bg: 'bg-orange-500/10',     border: 'border-orange-500/20',     icon: '🎓', label: 'College' },
  PERSONAL: { bg: 'bg-purple-500/10',     border: 'border-purple-500/20',     icon: '🏠', label: 'Personal' },
}

const SchedulePage = () => {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())

  const from = startOfDay(selectedDate).toISOString()
  const to = endOfDay(selectedDate).toISOString()

  const { data: blocks = [], isLoading, refetch } = useQuery({
    queryKey: ['schedule', from, to],
    queryFn: async (): Promise<ScheduleBlock[]> => {
      const res = await api.get(`/schedule?from=${from}&to=${to}`)
      return res.data.data
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => api.post('/schedule/generate', { planDays: 7 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['schedule-today'] })
    },
  })

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))

  return (
    <IonPage>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { refetch().finally(() => e.detail.complete()) }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="max-w-2xl mx-auto px-4 pt-12 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold gradient-text">Schedule</h1>
              <p className="text-text-muted text-sm">{format(selectedDate, 'MMMM d, yyyy')}</p>
            </div>
            <button
              id="generate-schedule-btn"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-primary text-sm py-2 px-4"
            >
              {generateMutation.isPending ? (
                <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
              ) : '⚡'}
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Week Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {days.map((day) => {
              const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all shrink-0 min-w-[50px]
                    ${isSelected
                      ? 'bg-brand-primary text-white shadow-glow'
                      : 'glass-card text-text-secondary hover:text-text-primary'}`}
                >
                  <span className="text-xs">{format(day, 'EEE')}</span>
                  <span className="text-lg font-bold">{format(day, 'd')}</span>
                </button>
              )
            })}
          </div>

          {/* Timeline */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : blocks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="text-4xl mb-3">📭</div>
              <h3 className="font-bold text-text-primary mb-1">Nothing scheduled</h3>
              <p className="text-text-muted text-sm mb-4">Click "Generate" to create your AI-powered schedule</p>
            </div>
          ) : (
            <div className="relative">
              {blocks.map((block, i) => {
                const cfg = blockConfig[block.type] || blockConfig.TASK
                const task = block.taskId as Task | undefined
                const start = parseISO(block.startTime)
                const end = parseISO(block.endTime)
                const isNow = new Date() >= start && new Date() <= end

                return (
                  <motion.div
                    key={block._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="timeline-block"
                  >
                    {/* Time label */}
                    <div className="w-14 shrink-0 text-right">
                      <span className="text-xs font-mono text-text-muted">
                        {format(start, 'HH:mm')}
                      </span>
                    </div>

                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 z-10
                        ${isNow ? 'bg-brand-primary border-brand-primary animate-pulse' : `${cfg.border} bg-bg-primary`}`}
                      />
                      {i < blocks.length - 1 && (
                        <div className="flex-1 w-px bg-white/5 mt-1" style={{ minHeight: 24 }} />
                      )}
                    </div>

                    {/* Block card */}
                    <div className={`flex-1 mb-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border} ${isNow ? 'ring-1 ring-brand-primary/50' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span>{cfg.icon}</span>
                            <span className="font-semibold text-sm text-text-primary truncate">
                              {block.type === 'TASK' ? (task?.title || 'Task') : cfg.label}
                            </span>
                            {isNow && <span className="badge bg-brand-primary/20 text-brand-primary text-xs">NOW</span>}
                            {block.status === 'completed' && <span className="text-status-success text-xs">✓ Done</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                            <span>{format(start, 'h:mm a')} – {format(end, 'h:mm a')}</span>
                            <span>{block.scheduledDurationMinutes}min</span>
                          </div>
                          {task?.predictedDurationMinutes && task.estimatedDurationMinutes && (
                            <div className="text-xs text-brand-accent mt-1">
                              🤖 AI adjusted: {task.estimatedDurationMinutes}min → {task.predictedDurationMinutes}min
                            </div>
                          )}
                          {block.reason && block.type !== 'BUFFER' && (
                            <div className="text-xs text-text-muted mt-1 italic">{block.reason}</div>
                          )}
                        </div>
                        {task && block.status === 'scheduled' && (
                          <div className="flex flex-col gap-1 shrink-0">
                            <ExtendButton taskId={task._id} />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

const ExtendButton = ({ taskId }: { taskId: string }) => {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const extendMutation = useMutation({
    mutationFn: (mins: number) => api.post(`/tasks/${taskId}/extend`, { extensionMinutes: mins }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setOpen(false)
    },
  })

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-brand-primary hover:text-brand-secondary transition-colors bg-brand-primary/10 px-2 py-1 rounded-lg"
      >
        +Extend
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-bg-elevated border border-white/10 rounded-xl p-2 z-10 flex flex-col gap-1 shadow-card">
          {[15, 30, 60].map((m) => (
            <button key={m} onClick={() => extendMutation.mutate(m)}
              className="text-xs text-text-primary hover:text-brand-primary px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors">
              +{m} min
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SchedulePage
