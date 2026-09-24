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

const PRIORITY_LABELS: Record<number, { label: string; class: string }> = {
  1: { label: 'Low', class: 'priority-badge-1' },
  2: { label: 'Normal', class: 'priority-badge-2' },
  3: { label: 'Medium', class: 'priority-badge-3' },
  4: { label: 'High', class: 'priority-badge-4' },
  5: { label: 'Critical', class: 'priority-badge-5' },
}

const CATEGORY_ICONS: Record<string, string> = {
  coding: '💻', math: '📐', writing: '✍️', reading: '📚',
  research: '🔍', project: '🚀', exam_prep: '📝', assignment: '📋',
  lab: '🧪', other: '📌',
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
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
    pending: 'text-text-muted',
    in_progress: 'text-brand-accent',
    completed: 'text-status-success',
    skipped: 'text-text-muted line-through',
    overdue: 'text-status-error',
  }

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
              <h1 className="text-2xl font-bold gradient-text">Tasks</h1>
              <p className="text-text-muted text-sm">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFeedback(true)}
                className="btn-secondary text-sm py-2 px-3"
                id="vibe-check-btn"
              >
                😊 Vibe
              </button>
              <button
                id="add-task-btn"
                onClick={() => { setEditTask(null); setShowForm(true) }}
                className="btn-primary text-sm py-2 px-4"
              >
                + Add Task
              </button>
            </div>
          </div>

          {/* Natural Language Task Input */}
          <NLTaskInput />

          {/* Status Filter Tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 transition-all
                  ${statusFilter === value
                    ? 'bg-brand-primary text-white'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Task List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="font-bold text-text-primary mb-1">
                {statusFilter ? `No ${statusFilter} tasks` : 'No tasks yet'}
              </h3>
              <p className="text-text-muted text-sm mb-4">
                {statusFilter ? 'Try a different filter' : 'Add your first task to get started'}
              </p>
              {!statusFilter && (
                <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Task</button>
              )}
            </div>
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04 }}
                      className={`glass-card-elevated p-4 transition-all hover:border-brand-primary/20
                        ${task.status === 'completed' ? 'opacity-60' : ''}
                        ${isOverdue ? 'border-status-error/30' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Category icon */}
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-xl">
                          {CATEGORY_ICONS[task.category] || '📌'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`font-semibold text-sm ${statusColors[task.status]}`}>
                              {task.title}
                            </h3>
                            <span className={pri.class}>{pri.label}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs text-text-muted">
                              ⏱ {task.estimatedDurationMinutes}min
                              {hasMLPrediction && task.predictedDurationMinutes !== task.estimatedDurationMinutes && (
                                <span className="text-brand-accent ml-1">
                                  (AI: {task.predictedDurationMinutes}min)
                                </span>
                              )}
                            </span>
                            <span className={`text-xs ${isOverdue ? 'text-status-error' : 'text-text-muted'}`}>
                              📅 {format(deadline, 'MMM d')}
                              {isOverdue && ' ⚠️ Overdue'}
                            </span>
                            <span className="text-xs text-text-muted capitalize">📂 {task.category}</span>
                            {task.isRecurring && (
                              <span className="text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-full font-medium capitalize">
                                🔄 {task.recurrencePattern}
                              </span>
                            )}
                          </div>

                          {task.extensionCount > 0 && (
                            <div className="text-xs text-status-warning mt-1">
                              Extended {task.extensionCount}×
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {task.status !== 'completed' && task.status !== 'skipped' && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                          <button
                            id={`complete-task-${task._id}`}
                            onClick={() => setCompleteTask(task)}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            ✓ Complete
                          </button>
                          <button
                            onClick={() => setFocusTask(task)}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-brand-primary border-brand-primary/30 font-semibold"
                            title="Start Focus Mode Timer"
                          >
                            🔥 Focus
                          </button>
                          <button
                            onClick={() => { setEditTask(task); setShowForm(true) }}
                            className="btn-secondary text-xs py-1.5 px-3"
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
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                            title="Add to Google Calendar"
                          >
                            📅 GCal
                          </a>
                          <button
                            onClick={() => skipMutation.mutate(task._id)}
                            className="text-xs text-text-muted hover:text-status-warning transition-colors px-2 py-1.5"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(task._id)}
                            className="text-xs text-text-muted hover:text-status-error transition-colors px-2 py-1.5 ml-auto"
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

        {/* Modals */}
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
