import { useState } from 'react'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import api from '../lib/api'
import type { Task, TaskStatus } from '../types'
import TaskFormModal from '../components/TaskFormModal'
import CompleteTaskModal from '../components/CompleteTaskModal'
import FeedbackModal from '../components/FeedbackModal'
import { getGoogleCalendarUrl } from '../utils/googleCalendar'
import { NLTaskInput } from '../components/NLTaskInput'
import { FocusSessionModal } from '../components/FocusSessionModal'

const PRIORITY_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Low',      cls: 'priority-badge-1' },
  2: { label: 'Normal',   cls: 'priority-badge-2' },
  3: { label: 'Medium',   cls: 'priority-badge-3' },
  4: { label: 'High',     cls: 'priority-badge-4' },
  5: { label: 'Critical', cls: 'priority-badge-5' },
}

const CATEGORY_ICONS: Record<string, string> = {
  coding: '💻', math: '📐', writing: '✍️', reading: '📚',
  research: '🔍', project: '🚀', exam_prep: '📝', assignment: '📋',
  lab: '🧪', other: '📌',
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '',           label: 'All' },
  { value: 'pending',    label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',  label: 'Completed' },
]

const TasksPage = () => {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [completeTask, setCompleteTask] = useState<Task | null>(null)
  const [focusTask, setFocusTask] = useState<Task | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await api.get(`/tasks${params}`)
      return res.data
    },
  })

  const tasks: Task[] = data?.data || []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const skipMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/skip`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const statusColors: Record<TaskStatus, string> = {
    pending:     'text-text-primary',
    in_progress: 'text-brand-accent',
    completed:   'text-status-success',
    skipped:     'text-text-muted line-through',
    overdue:     'text-status-error',
  }

  return (
    <IonPage>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { refetch().finally(() => e.detail.complete()) }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="page-container">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-6 gap-3">
            <div>
              <h1 className="page-title">Tasks</h1>
              <p className="text-sm text-text-muted mt-1">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowFeedback(true)}
                className="btn-secondary !py-2 !px-3 text-sm"
                id="vibe-check-btn"
                aria-label="Check vibe"
              >
                😊 Vibe
              </button>
              <button
                id="add-task-btn"
                onClick={() => { setEditTask(null); setShowForm(true) }}
                className="btn-primary !py-2 !px-4 text-sm"
              >
                <span className="text-base leading-none">+</span>
                <span>Task</span>
              </button>
            </div>
          </div>

          {/* ── Natural Language Task Input ─────────────────────── */}
          <NLTaskInput />

          {/* ── Status Filter Tabs ──────────────────────────────── */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all border
                  ${statusFilter === value
                    ? 'bg-brand-primary text-white border-brand-primary shadow-glow'
                    : 'bg-transparent text-text-secondary border-white/8 hover:border-white/14 hover:text-text-primary'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Task List ───────────────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-10 text-center"
            >
              <div className="text-5xl mb-4">✨</div>
              <h3 className="font-semibold text-text-primary text-lg mb-2">
                {statusFilter ? `No ${statusFilter.replace('_', ' ')} tasks` : 'No tasks yet'}
              </h3>
              <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
                {statusFilter ? 'Try a different filter' : 'Add your first task to get started'}
              </p>
              {!statusFilter && (
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  + Add Task
                </button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence>
              <div className="space-y-3">
                {tasks.map((task, i) => {
                  const pri = PRIORITY_LABELS[task.priority]
                  const deadline = parseISO(task.deadline)
                  const isOverdue = deadline < new Date() && task.status !== 'completed'
                  const hasMLPrediction = !!task.predictedDurationMinutes

                  return (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: i * 0.035, duration: 0.2 }}
                      className={`glass-card-elevated transition-all
                        ${task.status === 'completed' ? 'opacity-55' : ''}
                        ${isOverdue ? 'border-status-error/25' : ''}`}
                    >
                      <div className="p-4 pb-0">
                        <div className="flex items-start gap-3">
                          {/* Category icon */}
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-xl mt-0.5">
                            {CATEGORY_ICONS[task.category] || '📌'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h3 className={`font-semibold text-sm leading-snug ${statusColors[task.status]}`}>
                                {task.title}
                              </h3>
                              <span className={`${pri.cls} shrink-0 mt-0.5`}>{pri.label}</span>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs text-text-muted flex items-center gap-1">
                                ⏱ {task.estimatedDurationMinutes}min
                                {hasMLPrediction && task.predictedDurationMinutes !== task.estimatedDurationMinutes && (
                                  <span className="text-brand-accent">
                                    → {task.predictedDurationMinutes}m AI
                                  </span>
                                )}
                              </span>
                              <span className={`text-xs ${isOverdue ? 'text-status-error font-medium' : 'text-text-muted'}`}>
                                📅 {format(deadline, 'MMM d')}
                                {isOverdue && ' · Overdue'}
                              </span>
                              <span className="text-xs text-text-muted capitalize">
                                {task.category.replace('_', ' ')}
                              </span>
                              {task.isRecurring && (
                                <span className="text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-full font-medium capitalize">
                                  🔄 {task.recurrencePattern}
                                </span>
                              )}
                              {task.extensionCount > 0 && (
                                <span className="text-xs text-status-warning">
                                  Extended {task.extensionCount}×
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {task.status !== 'completed' && task.status !== 'skipped' && (
                        <div className="flex items-center gap-1.5 px-4 py-3 mt-1 border-t border-white/5 overflow-x-auto scrollbar-hide">
                          <button
                            id={`complete-task-${task._id}`}
                            onClick={() => setCompleteTask(task)}
                            className="btn-primary !text-xs !py-1.5 !px-3 !min-h-0 shrink-0"
                          >
                            ✓ Complete
                          </button>
                          <button
                            onClick={() => setFocusTask(task)}
                            className="btn-secondary !text-xs !py-1.5 !px-3 !min-h-0 text-brand-primary border-brand-primary/25 font-semibold shrink-0"
                            title="Start Focus Mode Timer"
                          >
                            🔥 Focus
                          </button>
                          <button
                            onClick={() => { setEditTask(task); setShowForm(true) }}
                            className="btn-secondary !text-xs !py-1.5 !px-3 !min-h-0 shrink-0"
                          >
                            Edit
                          </button>
                          <a
                            href={getGoogleCalendarUrl({
                              title: task.title,
                              description: task.description,
                              startTime: task.scheduledStartTime || task.deadline,
                              endTime: task.scheduledEndTime || new Date(new Date(task.deadline).getTime() + (task.estimatedDurationMinutes || 60) * 60000).toISOString(),
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary !text-xs !py-1.5 !px-3 !min-h-0 shrink-0"
                            title="Add to Google Calendar"
                          >
                            📅
                          </a>
                          <div className="flex-1" />
                          <button
                            onClick={() => skipMutation.mutate(task._id)}
                            className="text-xs text-text-muted hover:text-status-warning transition-colors px-2 py-1.5 shrink-0"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(task._id)}
                            className="text-xs text-text-muted hover:text-status-error transition-colors px-2 py-1.5 shrink-0"
                            aria-label="Delete task"
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* ── Modals ──────────────────────────────────────────────── */}
        <TaskFormModal
          isOpen={showForm}
          task={editTask}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['tasks'] }) }}
        />
        {completeTask && (
          <CompleteTaskModal
            task={completeTask}
            onClose={() => setCompleteTask(null)}
            onCompleted={() => {
              setCompleteTask(null)
              qc.invalidateQueries({ queryKey: ['tasks'] })
              qc.invalidateQueries({ queryKey: ['schedule'] })
              qc.invalidateQueries({ queryKey: ['analytics-summary'] })
            }}
          />
        )}
        <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
        {focusTask && (
          <FocusSessionModal
            isOpen={!!focusTask}
            task={focusTask}
            onClose={() => setFocusTask(null)}
          />
        )}
      </IonContent>
    </IonPage>
  )
}

export default TasksPage
