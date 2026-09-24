import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import type { ScheduleBlock, Task, AnalyticsSummary } from '../types'
import TaskQuickActions from '../components/TaskQuickActions'
import WorkloadMeter from '../components/WorkloadMeter'
import InsightCard from '../components/InsightCard'

const fetchTodaySchedule = async (): Promise<ScheduleBlock[]> => {
  const res = await api.get('/schedule/today')
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

const blockColors: Record<string, string> = {
  TASK: 'bg-brand-primary/20 border-brand-primary/30 text-brand-primary',
  BREAK: 'bg-status-success/15 border-status-success/20 text-status-success',
  BUFFER: 'bg-white/5 border-white/10 text-text-muted',
  SLEEP: 'bg-blue-900/20 border-blue-500/20 text-blue-400',
  COLLEGE: 'bg-orange-500/15 border-orange-500/20 text-orange-400',
  PERSONAL: 'bg-purple-500/15 border-purple-500/20 text-purple-400',
}

const DashboardPage = () => {
  const { user } = useAuthStore()

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

        <div className="max-w-2xl mx-auto px-4 pt-12 pb-24">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <p className="text-text-muted text-sm">{greeting()},</p>
            <h1 className="text-2xl font-bold text-text-primary">{user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-text-muted text-xs mt-0.5">{format(now, 'EEEE, MMMM d')}</p>
          </motion.div>

          {/* Metrics Row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <div className="metric-card">
              <div className="metric-label">Remaining</div>
              <div className="metric-value text-status-warning">{totalToday - completedToday}</div>
              <div className="text-xs text-text-muted">of {totalToday} tasks</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Completed</div>
              <div className="metric-value text-status-success">{completedToday}</div>
              <div className="text-xs text-text-muted">today</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Planned</div>
              <div className="metric-value text-brand-accent">{hoursPlanned.toFixed(1)}h</div>
              <div className="text-xs text-text-muted">study time</div>
            </div>
          </motion.div>

          {/* Workload Meter */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <WorkloadMeter
              plannedHours={hoursPlanned}
              limitHours={user?.dailyStudyLimitHours || 8}
              vibeScore={analytics?.latestVibeScore}
            />
          </motion.div>

          {/* Next Task */}
          {nextBlock && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card-elevated p-5 mb-6 border-l-4 border-brand-primary"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="pulse-dot" />
                <span className="text-xs text-text-muted uppercase tracking-wider">Next up</span>
              </div>
              <h3 className="font-bold text-text-primary text-lg">
                {(nextTask as Task)?.title || 'Task'}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
                <span>🕐 {format(parseISO(nextBlock.startTime), 'h:mm a')}</span>
                <span>⏱ {nextBlock.scheduledDurationMinutes}min</span>
                {(nextTask as Task)?.category && (
                  <span className="capitalize">📂 {(nextTask as Task).category}</span>
                )}
              </div>
              {nextBlock && <TaskQuickActions block={nextBlock} onAction={() => refetchSchedule()} />}
            </motion.div>
          )}

          {/* Today's Timeline (mini) */}
          {schedule.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-6"
            >
              <h2 className="section-title">Today's Schedule</h2>
              <div className="space-y-2">
                {schedule.slice(0, 6).map((block) => (
                  <div key={block._id} className={`flex items-center gap-3 p-3 rounded-xl border ${blockColors[block.type]}`}>
                    <span className="text-xs font-mono w-14 shrink-0">
                      {format(parseISO(block.startTime), 'HH:mm')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {block.type === 'TASK'
                          ? (block.taskId as Task)?.title || 'Task'
                          : block.type === 'BREAK' ? '☕ Break'
                          : block.type === 'BUFFER' ? '🔄 Buffer'
                          : block.reason || block.type}
                      </div>
                      <div className="text-xs opacity-70">{block.scheduledDurationMinutes}min</div>
                    </div>
                    {block.status === 'completed' && <span className="text-status-success text-sm">✓</span>}
                  </div>
                ))}
                {schedule.length > 6 && (
                  <p className="text-center text-text-muted text-xs">+{schedule.length - 6} more blocks</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {schedule.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-8 text-center mb-6"
            >
              <div className="text-5xl mb-3">📅</div>
              <h3 className="font-bold text-text-primary mb-1">No schedule yet</h3>
              <p className="text-text-muted text-sm mb-4">Add tasks and generate your personalized schedule</p>
              <a href="/tasks" className="btn-primary inline-flex">+ Add Tasks</a>
            </motion.div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h2 className="section-title">AI Insights</h2>
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default DashboardPage
