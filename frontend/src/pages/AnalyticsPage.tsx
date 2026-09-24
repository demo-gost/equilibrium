import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import api from '../lib/api'
import type { AnalyticsSummary, WeeklyTrend } from '../types'
import InsightCard from '../components/InsightCard'

const fetchSummary = async (): Promise<AnalyticsSummary> => (await api.get('/analytics/summary')).data.data
const fetchTrends = async (): Promise<WeeklyTrend[]> => (await api.get('/analytics/trends')).data.data
const fetchInsights = async (): Promise<string[]> => (await api.get('/analytics/insights')).data.data

const MetricCard = ({ label, value, unit = '', color = 'text-text-primary', sub = '' }: {
  label: string; value: number | string; unit?: string; color?: string; sub?: string
}) => (
  <div className="metric-card">
    <div className="metric-label">{label}</div>
    <div className={`metric-value ${color}`}>{value}<span className="text-sm font-normal text-text-muted ml-1">{unit}</span></div>
    {sub && <div className="text-xs text-text-muted">{sub}</div>}
  </div>
)

const AnalyticsPage = () => {
  const { data: summary, refetch: refetchSummary } = useQuery({ queryKey: ['analytics-summary'], queryFn: fetchSummary })
  const { data: trends = [] } = useQuery({ queryKey: ['analytics-trends'], queryFn: fetchTrends })
  const { data: insights = [] } = useQuery({ queryKey: ['insights'], queryFn: fetchInsights })

  const completionPieData = summary ? [
    { name: 'Completed', value: summary.completedTasks },
    { name: 'Remaining', value: summary.totalTasks - summary.completedTasks },
  ] : []

  return (
    <IonPage>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { refetchSummary().finally(() => e.detail.complete()) }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="max-w-2xl mx-auto px-4 pt-12 pb-24">
          <div className="mb-6">
            <h1 className="text-2xl font-bold gradient-text">Analytics</h1>
            <p className="text-text-muted text-sm">Your productivity insights</p>
          </div>

          {/* North Star Metric */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card-elevated p-5 mb-6 border border-brand-primary/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-xl">⚖️</div>
                <div>
                  <div className="font-bold text-text-primary">Sustainable On-Time Rate</div>
                  <div className="text-xs text-text-muted">North Star Metric</div>
                </div>
                <div className="ml-auto text-3xl font-black gradient-text">{summary.sustainableOnTimeRate}%</div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-brand-primary to-brand-secondary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(summary.sustainableOnTimeRate, 100)}%` }}
                />
              </div>
            </motion.div>
          )}

          {/* Key Metrics Grid */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3 mb-6"
            >
              <MetricCard
                label="Completion Rate"
                value={summary.completionRate}
                unit="%"
                color="text-status-success"
                sub={`${summary.completedTasks} of ${summary.totalTasks} tasks`}
              />
              <MetricCard
                label="Avg Estimation Error"
                value={`${summary.avgEstimationErrorPercent > 0 ? '+' : ''}${summary.avgEstimationErrorPercent}`}
                unit="%"
                color={summary.avgEstimationErrorPercent > 20 ? 'text-status-warning' : 'text-text-primary'}
                sub={summary.avgEstimationErrorPercent > 0 ? 'Over-running estimates' : 'Good estimation!'}
              />
              <MetricCard
                label="Schedule Adherence"
                value={summary.scheduleAdherenceRate}
                unit="%"
                color="text-brand-accent"
              />
              <MetricCard
                label="Extension Rate"
                value={summary.extensionRate}
                unit="%"
                color={summary.extensionRate > 40 ? 'text-status-warning' : 'text-text-primary'}
                sub="Tasks needing more time"
              />
              <MetricCard
                label="Deadline Miss Rate"
                value={summary.deadlineMissRate}
                unit="%"
                color={summary.deadlineMissRate > 15 ? 'text-status-error' : 'text-status-success'}
              />
              {summary.latestVibeScore !== undefined && (
                <MetricCard
                  label="Workload Feeling"
                  value={['😊', '🙂', '😐', '😓', '😰'][summary.latestVibeScore - 1] || '—'}
                  unit=""
                  color="text-text-primary"
                  sub={`Score: ${summary.latestVibeScore}/5`}
                />
              )}
            </motion.div>
          )}

          {/* Task Completion Pie */}
          {summary && summary.totalTasks > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-4 mb-6"
            >
              <h2 className="section-title text-base mb-4">Task Completion</h2>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={completionPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      <Cell fill="#6366f1" />
                      <Cell fill="#1a2236" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div>
                  <div className="text-3xl font-black text-brand-primary">{summary.completionRate}%</div>
                  <div className="text-text-muted text-sm">{summary.completedTasks} completed</div>
                  <div className="text-text-muted text-sm">{summary.totalTasks - summary.completedTasks} remaining</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Weekly Workload Trend */}
          {trends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4 mb-6"
            >
              <h2 className="section-title text-base mb-4">Weekly Study Hours</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trends} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                    tickFormatter={(w) => w.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }}
                    cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                    formatter={(v: any) => [`${typeof v === 'number' ? v.toFixed(1) : v}h`, 'Hours']}
                  />
                  <Bar dataKey="totalHoursStudied" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Estimation Error Trend */}
          {trends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-4 mb-6"
            >
              <h2 className="section-title text-base mb-1">Estimation Accuracy</h2>
              <p className="text-xs text-text-muted mb-4">Closer to 0% = better estimates</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trends} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                    tickFormatter={(w) => w.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }}
                    formatter={(v: any) => [`${typeof v === 'number' ? v.toFixed(1) : v}%`, 'Error']}
                  />
                  <Line type="monotone" dataKey="avgEstimationError" stroke="#06b6d4"
                    strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Empty analytics state */}
          {(!summary || summary.totalTasks === 0) && (
            <div className="glass-card p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-bold text-text-primary mb-1">No data yet</h3>
              <p className="text-text-muted text-sm">Complete tasks to start seeing your analytics</p>
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="section-title">🤖 AI Insights</h2>
              <div className="space-y-3">
                {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
              </div>
            </motion.div>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default AnalyticsPage
