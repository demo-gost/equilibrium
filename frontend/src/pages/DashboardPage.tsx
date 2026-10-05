import { useEffect } from 'react'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { useThemeStore } from '../store/theme.store'
import { useNotifications } from '../hooks/useNotifications'
import type { ScheduleBlock, Task, AnalyticsSummary } from '../types'
import TaskQuickActions from '../components/TaskQuickActions'
import WorkloadMeter from '../components/WorkloadMeter'
import InsightCard from '../components/InsightCard'
import { OnboardingTour } from '../components/OnboardingTour'

const fetchTodaySchedule = async (): Promise<ScheduleBlock[]> => {
  const now = new Date()
  const from = startOfDay(now).toISOString()
  const to = endOfDay(now).toISOString()
  const res = await api.get(`/schedule?from=${from}&to=${to}`)
  return res.data.data
}

const fetchAnalytics = async (): Promise<AnalyticsSummary> => {
  const res = await api.get('/analytics/summary')
  return res.data.data
}

const fetchInsights = async (): Promise<string[]> => {
  const res = await api.get('/analytics/insights')
  return res.data.data
}

const BLOCK_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  TASK:     { bg: 'bg-brand-primary/10 border-brand-primary/20 text-text-primary', dot: 'bg-brand-primary', label: '📚' },
  BREAK:    { bg: 'bg-status-success/10 border-status-success/20 text-text-secondary', dot: 'bg-status-success', label: '☕' },
  BUFFER:   { bg: 'bg-white/5 border-white/10 text-text-muted', dot: 'bg-white/20', label: '🔄' },
  SLEEP:    { bg: 'bg-blue-950/30 border-blue-800/20 text-blue-300', dot: 'bg-blue-400', label: '🌙' },
  COLLEGE:  { bg: 'bg-orange-950/30 border-orange-800/20 text-orange-300', dot: 'bg-orange-400', label: '🎓' },
  PERSONAL: { bg: 'bg-purple-950/30 border-purple-800/20 text-purple-300', dot: 'bg-purple-400', label: '🏠' },
}

const MotionCard = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
)

const DashboardPage = () => {
  const { user } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const { checkTaskDeadlines } = useNotifications()

  const { data: schedule = [], refetch: refetchSchedule } = useQuery({
    queryKey: ['schedule-today'],
    queryFn: fetchTodaySchedule,
  })

  const { data: analytics } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: fetchAnalytics,
  })

  const { data: insights = [] } = useQuery({
    queryKey: ['insights'],
    queryFn: fetchInsights,
  })

  useEffect(() => {
    const tasks = schedule
      .filter((b) => b.type === 'TASK' && b.taskId && typeof b.taskId === 'object')
      .map((b) => b.taskId as Task)
    if (tasks.length > 0) {
      checkTaskDeadlines(tasks)
    }
  }, [schedule, checkTaskDeadlines])

  const now = new Date()
  const taskBlocks = schedule.filter((b) => b.type === 'TASK' && b.status === 'scheduled')
  const nextBlock = taskBlocks.find((b) => new Date(b.startTime) > now) || taskBlocks[0]
  const nextTask = nextBlock?.taskId as Task | undefined
  const completedToday = schedule.filter((b) => b.status === 'completed').length
  const totalToday = schedule.filter((b) => b.type === 'TASK').length
  const hoursPlanned = schedule
    .filter((b) => b.type === 'TASK')
    .reduce((s, b) => s + b.scheduledDurationMinutes / 60, 0)

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <IonPage>
      <IonContent className="bg-bg-primary">
        <IonRefresher slot="fixed" onIonRefresh={(e) => { refetchSchedule().finally(() => e.detail.complete()) }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="page-container">
          {/* ── Header ─────────────────────────────────────────── */}
          <MotionCard className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1">
                {format(now, 'EEEE, MMMM d')}
              </p>
              <h1 className="page-title">
                {greeting()}, {user?.name?.split(' ')[0]}
              </h1>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn-secondary !p-2.5 !min-h-0 rounded-xl text-lg leading-none"
              title="Toggle theme"
              aria-label="Toggle light and dark theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </MotionCard>

          {/* ── Metrics ────────────────────────────────────────── */}
          <MotionCard delay={0.05} className="grid grid-cols-3 gap-3 mb-6">
            <div className="metric-card">
              <div className="metric-label">Remaining</div>
              <div className="metric-value text-status-warning">{totalToday - completedToday}</div>
              <div className="text-xs text-text-muted">of {totalToday}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Done</div>
              <div className="metric-value text-status-success">{completedToday}</div>
              <div className="text-xs text-text-muted">today</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Planned</div>
              <div className="metric-value text-brand-accent">{hoursPlanned.toFixed(1)}h</div>
              <div className="text-xs text-text-muted">study</div>
            </div>
          </MotionCard>

          {/* ── Workload Meter ──────────────────────────────────── */}
          <MotionCard delay={0.1} className="mb-6">
            <WorkloadMeter
              plannedHours={hoursPlanned}
              limitHours={user?.dailyStudyLimitHours || 8}
              vibeScore={analytics?.latestVibeScore}
            />
          </MotionCard>

          {/* ── Next Task ───────────────────────────────────────── */}
          {nextBlock && (
            <MotionCard delay={0.15} className="mb-6">
              <div className="glass-card-elevated p-5 border-l-[3px] border-brand-primary">
                <div className="flex items-center gap-2 mb-2">
                  <div className="pulse-dot" />
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Up next</span>
                </div>
                <h3 className="font-semibold text-lg text-text-primary leading-tight mb-2">
                  {(nextTask as Task)?.title || 'Task'}
                </h3>
                <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
                  <span>🕐 {format(parseISO(nextBlock.startTime), 'h:mm a')}</span>
                  <span>⏱ {nextBlock.scheduledDurationMinutes}min</span>
                  {(nextTask as Task)?.category && (
                    <span className="capitalize">📂 {(nextTask as Task).category}</span>
                  )}
                </div>
                {nextBlock && <TaskQuickActions block={nextBlock} onAction={() => refetchSchedule()} />}
              </div>
            </MotionCard>
          )}

          {/* ── Today's Timeline ────────────────────────────────── */}
          {schedule.length > 0 && (
            <MotionCard delay={0.2} className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title mb-0">Today's Schedule</h2>
                {schedule.length > 6 && (
                  <a href="/schedule" className="text-xs text-brand-primary font-medium hover:underline">
                    View all →
                  </a>
                )}
              </div>
              <div className="space-y-1.5">
                {schedule.slice(0, 6).map((block) => {
                  const style = BLOCK_STYLES[block.type] || BLOCK_STYLES.TASK
                  const start = parseISO(block.startTime)
                  const isNow = new Date() >= start && new Date() <= parseISO(block.endTime)
                  return (
                    <div
                      key={block._id}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all ${style.bg}
                        ${isNow ? 'ring-1 ring-brand-primary/30' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                      <span className="text-xs font-mono font-semibold text-text-muted w-12 shrink-0">
                        {format(start, 'HH:mm')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {block.type === 'TASK'
                            ? (block.taskId as Task)?.title || 'Task'
                            : block.type === 'BREAK' ? 'Break'
                            : block.type === 'BUFFER' ? 'Buffer'
                            : block.reason || block.type}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted shrink-0">{block.scheduledDurationMinutes}m</span>
                      {block.status === 'completed' && <span className="text-status-success text-sm shrink-0">✓</span>}
                    </div>
                  )
                })}
              </div>
            </MotionCard>
          )}

          {/* ── Empty state ─────────────────────────────────────── */}
          {schedule.length === 0 && (
            <MotionCard delay={0.2} className="mb-6">
              <div className="glass-card p-10 text-center">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="font-semibold text-text-primary text-lg mb-2">Nothing scheduled yet</h3>
                <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
                  Add tasks and hit "Generate AI Schedule" to build your optimal day.
                </p>
                <a href="/tasks" className="btn-primary">
                  + Add Tasks
                </a>
              </div>
            </MotionCard>
          )}

          {/* ── AI Insights ─────────────────────────────────────── */}
          {insights.length > 0 && (
            <MotionCard delay={0.25}>
              <h2 className="section-title">AI Insights</h2>
              <div className="space-y-2.5">
                {insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} index={i} />
                ))}
              </div>
            </MotionCard>
          )}
        </div>

        <OnboardingTour />
      </IonContent>
    </IonPage>
  )
}

export default DashboardPage
