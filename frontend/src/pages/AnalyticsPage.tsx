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
    <div className={`metric-value ${color}`}>
      {value}
      {unit && <span className="text-sm font-normal text-text-muted ml-1">{unit}</span>}
    </div>
    {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
  </div>
)

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

const DARK_TOOLTIP_STYLE = {
  background: '#1c1c1e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#f5f5f7',
  fontSize: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
}

const AnalyticsPage = () => {
  const { data: summary, refetch: refetchSummary } = useQuery({ queryKey: ['analytics-summary'], queryFn: fetchSummary })
  const { data: trends = [] } = useQuery({ queryKey: ['analytics-trends'], queryFn: fetchTrends })
  const { data: insights = [] } = useQuery({ queryKey: ['insights'], queryFn: fetchInsights })

  const completionPieData = summary ? [
    { name: 'Completed', value: summary.completedTasks },
    { name: 'Remaining', value: Math.max(0, summary.totalTasks - summary.completedTasks) },
  ] : []

  return (
    <IonPage>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { refetchSummary().finally(() => e.detail.complete()) }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="page-container">
          {/* ── Header ─────────────────────────────────────────── */}
          <MotionCard className="mb-8">
            <h1 className="page-title">Analytics</h1>
            <p className="text-sm text-text-muted mt-1">Your productivity insights</p>
          </MotionCard>

          {/* ── North Star Metric ───────────────────────────────── */}
          {summary && (
            <MotionCard delay={0.05} className="mb-6">
              <div className="glass-card-elevated p-5 border border-brand-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/12 flex items-center justify-center text-xl shrink-0">
                    ⚖️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text-primary text-sm">Sustainable On-Time Rate</div>
                    <div className="text-xs text-text-muted mt-0.5">Your north star metric</div>
                  </div>
                  <div className="text-3xl font-black gradient-text shrink-0">
                    {summary.sustainableOnTimeRate}%
                  </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(summary.sustainableOnTimeRate, 100)}%` }}
                    transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full rounded-full"
                  />
                </div>
              </div>
            </MotionCard>
          )}

          {/* ── Key Metrics Grid ────────────────────────────────── */}
          {summary && (
            <MotionCard delay={0.1} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <MetricCard
                label="Completion"
                value={summary.completionRate}
                unit="%"
                color="text-status-success"
                sub={`${summary.completedTasks} of ${summary.totalTasks}`}
              />
              <MetricCard
                label="Estimation Error"
                value={`${summary.avgEstimationErrorPercent > 0 ? '+' : ''}${summary.avgEstimationErrorPercent}`}
                unit="%"
                color={summary.avgEstimationErrorPercent > 20 ? 'text-status-warning' : 'text-text-primary'}
                sub={summary.avgEstimationErrorPercent > 0 ? 'Over-running' : 'Accurate!'}
              />
              <MetricCard
                label="Adherence"
                value={summary.scheduleAdherenceRate}
                unit="%"
                color="text-brand-accent"
              />
              <MetricCard
                label="Extension Rate"
                value={summary.extensionRate}
                unit="%"
                color={summary.extensionRate > 40 ? 'text-status-warning' : 'text-text-primary'}
                sub="Needed more time"
              />
              <MetricCard
                label="Deadline Miss"
                value={summary.deadlineMissRate}
                unit="%"
                color={summary.deadlineMissRate > 15 ? 'text-status-error' : 'text-status-success'}
              />
              {summary.latestVibeScore !== undefined && (
                <MetricCard
                  label="Vibe Check"
                  value={['😊', '🙂', '😐', '😓', '😰'][summary.latestVibeScore - 1] || '—'}
                  unit=""
                  color="text-text-primary"
                  sub={`Score ${summary.latestVibeScore}/5`}
                />
              )}
            </MotionCard>
          )}

          {/* ── Task Completion Donut ───────────────────────────── */}
          {summary && summary.totalTasks > 0 && (
            <MotionCard delay={0.15} className="glass-card p-5 mb-6">
              <h2 className="section-title">Task Completion</h2>
              <div className="flex items-center gap-6">
                <div className="shrink-0">
                  <ResponsiveContainer width={100} height={100}>
                    <PieChart>
                      <Pie
                        data={completionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={48}
                        dataKey="value"
                        strokeWidth={0}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill="rgba(255,255,255,0.06)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="text-3xl font-black text-brand-primary">{summary.completionRate}%</div>
                  <div className="text-text-muted text-sm mt-1">{summary.completedTasks} completed</div>
                  <div className="text-text-muted text-sm">{Math.max(0, summary.totalTasks - summary.completedTasks)} remaining</div>
                </div>
              </div>
            </MotionCard>
          )}

          {/* ── Weekly Study Hours ──────────────────────────────── */}
          {trends.length > 0 && (
            <MotionCard delay={0.2} className="glass-card p-5 mb-6">
              <h2 className="section-title">Weekly Study Hours</h2>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={trends} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: '#636366' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(w) => w.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#636366' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={DARK_TOOLTIP_STYLE}
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    formatter={(v: any) => [`${typeof v === 'number' ? v.toFixed(1) : v}h`, 'Hours']}
                  />
                  <Bar dataKey="totalHoursStudied" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </MotionCard>
          )}

          {/* ── Estimation Accuracy ─────────────────────────────── */}
          {trends.length > 0 && (
            <MotionCard delay={0.25} className="glass-card p-5 mb-6">
              <h2 className="section-title">Estimation Accuracy</h2>
              <p className="text-xs text-text-muted mb-4">Closer to 0% = better estimates</p>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={trends} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: '#636366' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(w) => w.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#636366' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={DARK_TOOLTIP_STYLE}
                    formatter={(v: any) => [`${typeof v === 'number' ? v.toFixed(1) : v}%`, 'Error']}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgEstimationError"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </MotionCard>
          )}

          {/* ── Empty state ─────────────────────────────────────── */}
          {(!summary || summary.totalTasks === 0) && (
            <div className="glass-card p-10 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="font-semibold text-text-primary text-lg mb-2">No data yet</h3>
              <p className="text-text-muted text-sm">Complete tasks to start seeing your analytics</p>
            </div>
          )}

          {/* ── AI Insights ─────────────────────────────────────── */}
          {insights.length > 0 && (
            <MotionCard delay={0.3}>
              <h2 className="section-title">🤖 AI Insights</h2>
              <div className="space-y-2.5">
                {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
              </div>
            </MotionCard>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default AnalyticsPage
