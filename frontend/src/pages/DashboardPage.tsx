import { useEffect } from 'react'
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonViewWillEnter } from '@ionic/react'
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

const fetchAnalytics = async (): Promise<AnalyticsSummary> => {
  const res = await api.get('/analytics/summary')
  return res.data.data
}

const fetchInsights = async (): Promise<string[]> => {
  const res = await api.get('/analytics/insights')
  return res.data.data
}

const BLOCK_STYLES: Record<string, { bg: string; dot: string }> = {
  TASK:     { bg: 'bg-brand-primary/10 border-brand-primary/20 text-text-primary',    dot: 'bg-brand-primary' },
  BREAK:    { bg: 'bg-status-success/10 border-status-success/20 text-text-secondary', dot: 'bg-status-success' },
  BUFFER:   { bg: 'bg-white/5 border-white/10 text-text-muted',                        dot: 'bg-white/30' },
  SLEEP:    { bg: 'bg-blue-950/30 border-blue-800/20 text-blue-300',                   dot: 'bg-blue-400' },
  COLLEGE:  { bg: 'bg-orange-950/30 border-orange-800/20 text-orange-300',             dot: 'bg-orange-400' },
  PERSONAL: { bg: 'bg-purple-950/30 border-purple-800/20 text-purple-300',             dot: 'bg-purple-400' },
}

const BLOCK_LABEL: Record<string, string> = {
  TASK: '📚', BREAK: '☕', BUFFER: '🔄', SLEEP: '🌙', COLLEGE: '🎓', PERSONAL: '🏠',
}

const MotionCard = ({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) => (
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

  // Compute today's date range from local browser timezone
  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  const { data: schedule = [], refetch: refetchSchedule } = useQuery({
    queryKey: ['schedule', todayStart, todayEnd],
    queryFn: async (): Promise<ScheduleBlock[]> => {
      const res = await api.get(`/schedule?from=${todayStart}&to=${todayEnd}`)
      const raw = res.data?.data
      if (Array.isArray(raw)) return raw
      if (raw?.blocks && Array.isArray(raw.blocks)) return raw.blocks
      return []
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: fetchAnalytics,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: insights = [], refetch: refetchInsights } = useQuery({
    queryKey: ['insights'],
    queryFn: fetchInsights,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Re-fetch every time Home tab becomes visible (Ionic lifecycle)
  useIonViewWillEnter(() => {
    refetchSchedule()
    refetchAnalytics()
    refetchInsights()
  })

  useEffect(() => {
    const tasks = schedule
      .filter((b) => b.type === 'TASK' && b.taskId && typeof b.taskId === 'object')
      .map((b) => b.taskId as Task)
    if (tasks.length > 0) checkTaskDeadlines(tasks)
  }, [schedule, checkTaskDeadlines])

  // ── Derived metrics ────────────────────────────────────────────────────────
  const currentTime = new Date()
  const taskBlocks   = schedule.filter((b) => b.type === 'TASK')
  const completedToday = schedule.filter((b) => b.status === 'completed').length
  const totalToday     = taskBlocks.length
  const hoursPlanned   = taskBlocks.reduce((s, b) => s + b.scheduledDurationMinutes / 60, 0)

  // Next upcoming task (scheduled, not yet started)
  const upcomingTasks = schedule.filter(
    (b) => b.type === 'TASK' && b.status === 'scheduled' && new Date(b.startTime) > currentTime
  )
  const nextBlock = upcomingTasks[0] || taskBlocks.find((b) => b.status === 'scheduled')
  const nextTask  = nextBlock?.taskId as Task | undefined

  const greeting = () => {
    const h = currentTime.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Show TASK blocks prominently; then non-TASK blocks (sleep/break etc.) up to 6 total
  const taskBlocksSorted    = schedule.filter((b) => b.type === 'TASK').sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  const nonTaskBlocksSorted = schedule.filter((b) => b.type !== 'TASK').sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  const timelineBlocks      = [...taskBlocksSorted, ...nonTaskBlocksSorted].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  return (
    <IonPage>
      <IonContent className="bg-bg-primary">
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => {
            Promise.all([refetchSchedule(), refetchAnalytics(), refetchInsights()])
              .finally(() => e.detail.complete())
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <div className="page-container">
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <MotionCard className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1">
                {format(currentTime, 'EEEE, MMMM d')}
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

          {/* ── Metrics ─────────────────────────────────────────────────────── */}
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

          {/* ── Workload Meter ───────────────────────────────────────────────── */}
          <MotionCard delay={0.1} className="mb-6">
            <WorkloadMeter
              plannedHours={hoursPlanned}
              limitHours={user?.dailyStudyLimitHours || 8}
              vibeScore={analytics?.latestVibeScore}
            />
          </MotionCard>

          {/* ── Up Next Task ─────────────────────────────────────────────────── */}
          {nextBlock && (
            <MotionCard delay={0.15} className="mb-6">
              <div className="glass-card-elevated p-5 border-l-[3px] border-brand-primary">
                <div className="flex items-center gap-2 mb-2">
                  <div className="pulse-dot" />
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                    Up next
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-text-primary leading-tight mb-2">
                  {nextTask?.title || 'Task'}
                </h3>
                <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
                  <span>🕐 {format(parseISO(nextBlock.startTime), 'h:mm a')}</span>
                  <span>⏱ {nextBlock.scheduledDurationMinutes}min</span>
                  {nextTask?.category && (
                    <span className="capitalize">📂 {nextTask.category}</span>
                  )}
                </div>
                <TaskQuickActions block={nextBlock} onAction={() => refetchSchedule()} />
              </div>
            </MotionCard>
          )}

          {/* ── Today's Timeline ─────────────────────────────────────────────── */}
          {timelineBlocks.length > 0 ? (
            <MotionCard delay={0.2} className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title mb-0">Today's Schedule</h2>
                <a href="/schedule" className="text-xs text-brand-primary font-medium hover:underline">
                  View all →
                </a>
              </div>
              <div className="space-y-1.5">
                {timelineBlocks.slice(0, 8).map((block) => {
                  const style  = BLOCK_STYLES[block.type] || BLOCK_STYLES.TASK
                  const icon   = BLOCK_LABEL[block.type] || '📝'
                  const start  = parseISO(block.startTime)
                  const isActive =
                    currentTime >= start && currentTime <= parseISO(block.endTime)
                  const task = block.type === 'TASK' ? (block.taskId as Task) : null

                  return (
                    <div
                      key={block._id}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all ${style.bg}
                        ${isActive ? 'ring-1 ring-brand-primary/30' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                      <span className="text-xs font-mono font-semibold text-text-muted w-12 shrink-0">
                        {format(start, 'HH:mm')}
                      </span>
                      <span className="text-base shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {block.type === 'TASK'
                            ? task?.title || 'Task'
                            : block.type === 'BREAK'  ? 'Break'
                            : block.type === 'BUFFER' ? 'Buffer'
                            : block.reason || block.type}
                        </span>
                        {task?.category && (
                          <span className="text-xs text-text-muted capitalize">{task.category}</span>
                        )}
                      </div>
                      <span className="text-xs text-text-muted shrink-0">
                        {block.scheduledDurationMinutes}m
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full shrink-0">
                          NOW
                        </span>
                      )}
                      {block.status === 'completed' && (
                        <span className="text-status-success text-sm shrink-0">✓</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </MotionCard>
          ) : (
            <MotionCard delay={0.2} className="mb-6">
              <div className="glass-card p-10 text-center">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="font-semibold text-text-primary text-lg mb-2">Nothing scheduled yet</h3>
                <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
                  Add tasks and hit "Generate AI Schedule" to build your optimal day.
                </p>
                <a href="/tasks" className="btn-primary">+ Add Tasks</a>
              </div>
            </MotionCard>
          )}

          {/* ── AI Insights ──────────────────────────────────────────────────── */}
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
