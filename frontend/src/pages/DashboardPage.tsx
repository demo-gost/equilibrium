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
          {/* ── Header ───────────────────────────────────────────────────────── */}
          <MotionCard className="flex items-start justify-between mb-7">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5">
                {format(currentTime, 'EEEE, MMMM d')}
              </p>
              <h1 className="page-title">
                {greeting()},&nbsp;
                <span className="gradient-text">{user?.name?.split(' ')[0] ?? 'there'} 👋</span>
              </h1>
              <p className="text-sm text-text-muted mt-1.5">Here's your day at a glance.</p>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn-secondary !p-2.5 !min-h-0 !rounded-2xl text-lg leading-none"
              title="Toggle theme"
              aria-label="Toggle light and dark theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </MotionCard>

          {/* ── Stat Metric Cards ─────────────────────────────────────────────── */}
          <MotionCard delay={0.05} className="grid grid-cols-3 gap-3 mb-6">
            <div className="stat-card flex flex-col gap-1">
              <div className="metric-label">Remaining</div>
              <div className="metric-value text-brand-primary">{totalToday - completedToday}</div>
              <div className="text-xs text-text-muted font-medium">of {totalToday} tasks</div>
            </div>
            <div className="stat-card flex flex-col gap-1">
              <div className="metric-label">Done</div>
              <div className="metric-value text-status-success">{completedToday}</div>
              <div className="text-xs text-text-muted font-medium">today</div>
            </div>
            <div className="stat-card flex flex-col gap-1">
              <div className="metric-label">Planned</div>
              <div className="metric-value text-brand-accent">{hoursPlanned.toFixed(1)}h</div>
              <div className="text-xs text-text-muted font-medium">focus time</div>
            </div>
          </MotionCard>

          {/* ── Workload Meter ────────────────────────────────────────────────── */}
          <MotionCard delay={0.1} className="mb-6">
            <WorkloadMeter
              plannedHours={hoursPlanned}
              limitHours={user?.dailyStudyLimitHours || 8}
              vibeScore={analytics?.latestVibeScore}
            />
          </MotionCard>

          {/* ── Up Next Task ──────────────────────────────────────────────────── */}
          {nextBlock && (
            <MotionCard delay={0.15} className="mb-6">
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="pulse-dot" />
                  <span className="text-[11px] font-bold text-brand-primary uppercase tracking-widest">
                    Up Next
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-text-primary leading-tight mb-1.5 truncate">
                      {nextTask?.title || 'Task'}
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted bg-bg-primary px-2.5 py-1 rounded-full">
                        🕐 {format(parseISO(nextBlock.startTime), 'h:mm a')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted bg-bg-primary px-2.5 py-1 rounded-full">
                        ⏱ {nextBlock.scheduledDurationMinutes}m
                      </span>
                      {nextTask?.category && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted bg-bg-primary px-2.5 py-1 rounded-full capitalize">
                          📂 {nextTask.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <TaskQuickActions block={nextBlock} onAction={() => refetchSchedule()} />
                </div>
              </div>
            </MotionCard>
          )}

          {/* ── Today's Timeline ──────────────────────────────────────────────── */}
          {timelineBlocks.length > 0 ? (
            <MotionCard delay={0.2} className="mb-6">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-title mb-0">Today's Schedule</h2>
                  <a href="/schedule" className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1">
                    View all →
                  </a>
                </div>
                <div className="space-y-2">
                  {timelineBlocks.slice(0, 8).map((block) => {
                    const style   = BLOCK_STYLES[block.type] || BLOCK_STYLES.TASK
                    const icon    = BLOCK_LABEL[block.type] || '📝'
                    const start   = parseISO(block.startTime)
                    const isActive = currentTime >= start && currentTime <= parseISO(block.endTime)
                    const task    = block.type === 'TASK' ? (block.taskId as Task) : null

                    return (
                      <div
                        key={block._id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${style.bg}
                          ${isActive ? 'ring-2 ring-brand-primary/25 shadow-sm' : ''}`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
                        <span className="text-[11px] font-bold font-mono text-text-muted w-11 shrink-0">
                          {format(start, 'HH:mm')}
                        </span>
                        <span className="text-base shrink-0">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold truncate block text-text-primary">
                            {block.type === 'TASK'
                              ? task?.title || 'Task'
                              : block.type === 'BREAK'  ? 'Break Time'
                              : block.type === 'BUFFER' ? 'Buffer'
                              : block.reason || block.type}
                          </span>
                          {task?.category && (
                            <span className="text-xs text-text-muted capitalize font-medium">{task.category}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-text-muted shrink-0 bg-bg-primary px-2 py-0.5 rounded-full">
                          {block.scheduledDurationMinutes}m
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-white bg-brand-primary px-2 py-0.5 rounded-full shrink-0">
                            NOW
                          </span>
                        )}
                        {block.status === 'completed' && (
                          <span className="w-5 h-5 rounded-full bg-status-success/15 flex items-center justify-center shrink-0">
                            <span className="text-status-success text-xs font-bold">✓</span>
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </MotionCard>
          ) : (
            <MotionCard delay={0.2} className="mb-6">
              <div className="card p-10 text-center">
                <div className="w-16 h-16 rounded-3xl bg-brand-soft flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📅</span>
                </div>
                <h3 className="font-bold text-text-primary text-lg mb-2">Nothing scheduled yet</h3>
                <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
                  Add tasks and hit "Generate AI Schedule" to build your optimal day.
                </p>
                <a href="/tasks" className="btn-primary">+ Add Tasks</a>
              </div>
            </MotionCard>
          )}

          {/* ── AI Insights ───────────────────────────────────────────────────── */}
          {insights.length > 0 && (
            <MotionCard delay={0.25}>
              <h2 className="section-title">✨ AI Insights</h2>
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
