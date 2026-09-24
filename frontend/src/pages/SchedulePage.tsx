import { useState } from 'react'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, parseISO, addDays, startOfDay, endOfDay } from 'date-fns'
import api from '../lib/api'
import type { ScheduleBlock, Task } from '../types'
import { downloadICSFile, parseICSFile } from '../utils/ics'
import { WeeklyCalendarView } from '../components/WeeklyCalendarView'
import { OnboardingTour } from '../components/OnboardingTour'

const blockConfig: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  TASK:     { bg: 'bg-brand-primary/15 hover:bg-brand-primary/20', border: 'border-brand-primary/30', icon: '📚', label: 'Task' },
  BREAK:    { bg: 'bg-status-success/10 hover:bg-status-success/15', border: 'border-status-success/20', icon: '☕', label: 'Break' },
  BUFFER:   { bg: 'bg-white/3 hover:bg-white/6',           border: 'border-white/8',           icon: '🔄', label: 'Buffer' },
  SLEEP:    { bg: 'bg-blue-900/15 hover:bg-blue-900/25',   border: 'border-blue-500/20',       icon: '🌙', label: 'Sleep' },
  COLLEGE:  { bg: 'bg-orange-500/10 hover:bg-orange-500/15', border: 'border-orange-500/20',     icon: '🎓', label: 'College' },
  PERSONAL: { bg: 'bg-purple-500/10 hover:bg-purple-500/15', border: 'border-purple-500/20',     icon: '🏠', label: 'Personal' },
}

const SchedulePage = () => {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline')
  const [showTour, setShowTour] = useState(false)

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

  const updateBlockMutation = useMutation({
    mutationFn: ({ id, startTime, endTime }: { id: string; startTime: Date; endTime: Date }) =>
      api.put(`/schedule/block/${id}`, { startTime, endTime }),
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

        <div className="max-w-3xl mx-auto px-4 pt-10 pb-24 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card-elevated p-6 border border-brand-primary/20 shadow-xl rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚖️</span>
                <h1 className="text-2xl font-extrabold gradient-text">Study Schedule</h1>
              </div>
              <p className="text-text-muted text-xs mt-1 font-medium">
                📅 {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <button
              id="generate-schedule-btn"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-primary py-2.5 px-5 text-sm font-semibold shadow-glow shrink-0"
            >
              {generateMutation.isPending ? (
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : '⚡'}
              {generateMutation.isPending ? 'Generating Schedule...' : 'Generate AI Schedule'}
            </button>
          </div>

          {/* Action Toolbar & View Mode Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 glass-card p-3 rounded-2xl border border-white/5">
            {/* View Mode Segmented Switcher */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                📋 Timeline
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                📅 Weekly Grid
              </button>
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => downloadICSFile(blocks, `schedule-${format(selectedDate, 'yyyy-MM-dd')}.ics`)}
                disabled={blocks.length === 0}
                className="btn-secondary text-xs py-2 px-3 font-medium"
                title="Export schedule to Google Calendar / iCal"
              >
                📅 Export .ics
              </button>

              <label className="btn-secondary text-xs py-2 px-3 font-medium cursor-pointer" title="Import Google Calendar .ics file">
                📥 Import .ics
                <input
                  type="file"
                  accept=".ics,text/calendar"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const text = await file.text()
                    const events = parseICSFile(text)
                    for (const ev of events) {
                      await api.post('/schedule/protected-block', {
                        startTime: ev.startTime,
                        endTime: ev.endTime,
                        type: 'PERSONAL',
                        reason: ev.title,
                      }).catch(() => {})
                    }
                    qc.invalidateQueries({ queryKey: ['schedule'] })
                  }}
                />
              </label>

              <button
                onClick={() => setShowTour(true)}
                className="btn-secondary text-xs py-2 px-3 font-medium"
                title="Start Onboarding Tour"
              >
                ❓ Tour
              </button>
            </div>
          </div>

          {/* Week Selector Bar */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {days.map((day) => {
              const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center px-4 py-2.5 rounded-2xl transition-all shrink-0 min-w-[60px] border
                    ${isSelected
                      ? 'bg-brand-primary border-brand-primary text-white shadow-glow scale-[1.02]'
                      : 'glass-card border-white/5 text-text-secondary hover:text-text-primary hover:border-white/10'}`}
                >
                  <span className="text-[11px] font-semibold uppercase">{format(day, 'EEE')}</span>
                  <span className="text-base font-extrabold mt-0.5">{format(day, 'd')}</span>
                </button>
              )
            })}
          </div>

          {/* Main View Display */}
          {viewMode === 'grid' ? (
            <WeeklyCalendarView
              selectedDate={selectedDate}
              blocks={blocks}
              onBlockTimesUpdated={(id, startTime, endTime) => {
                updateBlockMutation.mutate({ id, startTime, endTime })
              }}
            />
          ) : isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
          ) : blocks.length === 0 ? (
            <div className="glass-card-elevated p-10 text-center rounded-2xl border border-white/5">
              <div className="text-5xl mb-3">📭</div>
              <h3 className="font-bold text-text-primary text-lg mb-1">Nothing Scheduled</h3>
              <p className="text-text-muted text-sm max-w-sm mx-auto mb-5">
                No blocks scheduled for this day. Click "Generate AI Schedule" to automatically build your optimal timeline.
              </p>
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="btn-primary py-2.5 px-5 text-xs font-semibold inline-flex items-center gap-2"
              >
                ⚡ Generate AI Schedule
              </button>
            </div>
          ) : (
            <div className="relative space-y-2">
              {blocks.map((block, i) => {
                const cfg = blockConfig[block.type] || blockConfig.TASK
                const task = block.taskId as Task | undefined
                const start = parseISO(block.startTime)
                const end = parseISO(block.endTime)
                const isNow = new Date() >= start && new Date() <= end

                return (
                  <motion.div
                    key={block._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="timeline-block group"
                  >
                    {/* Time Label Column */}
                    <div className="w-16 shrink-0 text-right pt-2">
                      <span className="text-xs font-mono font-bold text-text-muted">
                        {format(start, 'HH:mm')}
                      </span>
                    </div>

                    {/* Vertical Connector Line & Node */}
                    <div className="flex flex-col items-center pt-2.5">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 z-10 transition-all
                          ${isNow ? 'bg-brand-primary border-brand-primary ring-4 ring-brand-primary/30 animate-pulse' : `${cfg.border} bg-bg-primary`}`}
                      />
                      {i < blocks.length - 1 && (
                        <div className="flex-1 w-0.5 bg-white/10 mt-1" style={{ minHeight: 32 }} />
                      )}
                    </div>

                    {/* Block Card */}
                    <div
                      className={`flex-1 mb-2 p-4 rounded-2xl border ${cfg.bg} ${cfg.border} transition-all border-l-4 shadow-sm hover:shadow-md
                        ${isNow ? 'ring-2 ring-brand-primary/50 shadow-glow' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg">{cfg.icon}</span>
                            <span className="font-bold text-sm text-text-primary truncate">
                              {block.type === 'TASK' ? (task?.title || 'Task') : cfg.label}
                            </span>
                            {isNow && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary text-[10px] font-bold border border-brand-primary/30">
                                NOW ACTIVE
                              </span>
                            )}
                            {block.status === 'completed' && (
                              <span className="px-2 py-0.5 rounded-full bg-status-success/20 text-status-success text-[10px] font-bold border border-status-success/30">
                                ✓ COMPLETED
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted font-medium flex-wrap">
                            <span>🕒 {format(start, 'h:mm a')} – {format(end, 'h:mm a')}</span>
                            <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                              ⏱ {block.scheduledDurationMinutes} mins
                            </span>
                            {task?.category && (
                              <span className="capitalize bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                📂 {task.category}
                              </span>
                            )}
                          </div>

                          {task?.predictedDurationMinutes && task.estimatedDurationMinutes && (
                            <div className="text-xs text-brand-accent mt-2 font-medium flex items-center gap-1">
                              <span>🤖 AI Workload Tuning:</span>
                              <span>{task.estimatedDurationMinutes}m → {task.predictedDurationMinutes}m</span>
                            </div>
                          )}

                          {block.reason && block.type !== 'BUFFER' && (
                            <div className="text-xs text-text-muted mt-1.5 italic">
                              "{block.reason}"
                            </div>
                          )}
                        </div>

                        {task && block.status === 'scheduled' && (
                          <div className="flex flex-col items-end gap-2 shrink-0">
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

        <OnboardingTour forceOpen={showTour} onClose={() => setShowTour(false)} />
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
        className="text-xs text-brand-primary hover:text-brand-secondary transition-all bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
      >
        +Extend
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-bg-elevated border border-white/10 rounded-xl p-2 z-20 flex flex-col gap-1 shadow-2xl backdrop-blur-xl">
          {[15, 30, 60].map((m) => (
            <button
              key={m}
              onClick={() => extendMutation.mutate(m)}
              className="text-xs text-text-primary hover:text-brand-primary px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors text-left font-medium"
            >
              +{m} min
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SchedulePage
