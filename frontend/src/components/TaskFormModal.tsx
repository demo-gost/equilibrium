import { useState, useEffect } from 'react'
import { IonModal, IonContent } from '@ionic/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Task, TaskCategory } from '../types'
import { SmartDeadlineWarning } from './SmartDeadlineWarning'

interface Props {
  isOpen: boolean
  task: Task | null
  onClose: () => void
  onSaved: () => void
}

const CATEGORIES: { value: TaskCategory; label: string; icon: string }[] = [
  { value: 'coding',     label: 'Coding',     icon: '💻' },
  { value: 'math',       label: 'Math',       icon: '📐' },
  { value: 'writing',    label: 'Writing',    icon: '✍️' },
  { value: 'reading',    label: 'Reading',    icon: '📚' },
  { value: 'research',   label: 'Research',   icon: '🔍' },
  { value: 'project',    label: 'Project',    icon: '🚀' },
  { value: 'exam_prep',  label: 'Exam Prep',  icon: '📝' },
  { value: 'assignment', label: 'Assignment', icon: '📋' },
  { value: 'lab',        label: 'Lab',        icon: '🧪' },
  { value: 'other',      label: 'Other',      icon: '📌' },
]

const PRIORITY_LABELS = ['', 'Low', 'Normal', 'Medium', 'High', 'Critical']
const DIFFICULTY_LABELS = ['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard']

const toLocalISOString = (dateStr?: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const year  = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins  = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${mins}`
}

const TaskFormModal = ({ isOpen, task, onClose, onSaved }: Props) => {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other' as TaskCategory,
    priority: 3,
    difficulty: 3,
    estimatedDurationMinutes: 60,
    deadline: '',
    isRecurring: false,
    recurrencePattern: 'none' as 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly',
  })
  const [error, setError] = useState('')

  // Sync form state whenever modal opens or target task changes
  useEffect(() => {
    if (isOpen) {
      setForm({
        title:                    task?.title || '',
        description:              task?.description || '',
        category:                 task?.category || ('other' as TaskCategory),
        priority:                 task?.priority || 3,
        difficulty:               task?.difficulty || 3,
        estimatedDurationMinutes: task?.estimatedDurationMinutes || 60,
        deadline:                 toLocalISOString(task?.deadline),
        isRecurring:              task?.isRecurring || false,
        recurrencePattern:        task?.recurrencePattern || 'none',
      })
      setError('')
    }
  }, [task, isOpen])

  const update = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => task
      ? api.put(`/tasks/${task._id}`, { ...form, deadline: new Date(form.deadline).toISOString() })
      : api.post('/tasks', { ...form, deadline: new Date(form.deadline).toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      onSaved()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message || 'Failed to save task')
    },
  })

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonContent>
        <div className="bg-bg-secondary min-h-full px-4 pt-6 pb-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight">
              {task ? 'Edit Task' : 'New Task'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary transition-all"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-status-error/8 border border-status-error/20 text-status-error text-sm rounded-xl p-3.5 mb-5 flex items-center gap-2">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="label-text" htmlFor="task-title-input">Task Title *</label>
              <input
                id="task-title-input"
                className="input-field"
                placeholder="e.g. Build ML project"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="label-text">Description</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="Optional notes..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <label className="label-text">Category</label>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {CATEGORIES.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('category', value)}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-xs transition-all border
                      ${form.category === value
                        ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary'
                        : 'bg-white/3 border-white/6 text-text-muted hover:bg-white/7 hover:border-white/10'}`}
                  >
                    <span className="text-lg mb-0.5">{icon}</span>
                    <span className="truncate w-full text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Warning */}
            <SmartDeadlineWarning
              category={form.category}
              historicalErrorPercent={form.category === 'coding' || form.category === 'project' ? 40 : 0}
            />

            {/* Priority & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">
                  Priority: <span className="text-brand-primary font-semibold">{PRIORITY_LABELS[form.priority]}</span>
                </label>
                <input
                  type="range" min={1} max={5} value={form.priority}
                  onChange={(e) => update('priority', +e.target.value)}
                  className="w-full mt-2 accent-indigo-500"
                />
              </div>
              <div>
                <label className="label-text">
                  Difficulty: <span className="text-brand-secondary font-semibold">{DIFFICULTY_LABELS[form.difficulty]}</span>
                </label>
                <input
                  type="range" min={1} max={5} value={form.difficulty}
                  onChange={(e) => update('difficulty', +e.target.value)}
                  className="w-full mt-2 accent-violet-500"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="label-text">
                Duration: <span className="text-brand-accent font-semibold">{form.estimatedDurationMinutes} min</span>
                {form.estimatedDurationMinutes >= 60 && (
                  <span className="text-text-muted ml-1">
                    ({Math.floor(form.estimatedDurationMinutes / 60)}h{form.estimatedDurationMinutes % 60 > 0 ? ` ${form.estimatedDurationMinutes % 60}m` : ''})
                  </span>
                )}
              </label>
              <input
                type="range" min={15} max={480} step={15} value={form.estimatedDurationMinutes}
                onChange={(e) => update('estimatedDurationMinutes', +e.target.value)}
                className="w-full mt-2 accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>15m</span><span>2h</span><span>4h</span><span>6h</span><span>8h</span>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="label-text" htmlFor="task-deadline-input">Deadline *</label>
              <input
                id="task-deadline-input"
                type="datetime-local"
                className="input-field"
                value={form.deadline}
                onChange={(e) => update('deadline', e.target.value)}
              />
            </div>

            {/* Recurrence */}
            <div className="glass-card p-4 border border-white/6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-text-primary">🔄 Repeat Task</div>
                  <div className="text-xs text-text-muted mt-0.5">Auto-create after each completion</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !form.isRecurring
                    update('isRecurring', next)
                    if (next && form.recurrencePattern === 'none') update('recurrencePattern', 'daily')
                  }}
                  className={`relative w-11 h-6 rounded-full transition-all flex items-center
                    ${form.isRecurring ? 'bg-brand-primary' : 'bg-white/10'}`}
                  role="switch"
                  aria-checked={form.isRecurring}
                >
                  <span
                    className={`absolute w-4.5 h-4.5 bg-white rounded-full shadow transition-transform
                      ${form.isRecurring ? 'translate-x-5.5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
              {form.isRecurring && (
                <select
                  className="input-field text-sm"
                  value={form.recurrencePattern}
                  onChange={(e) => update('recurrencePattern', e.target.value)}
                >
                  <option value="daily">🔄 Daily</option>
                  <option value="weekdays">💼 Weekdays (Mon–Fri)</option>
                  <option value="weekly">📅 Weekly</option>
                  <option value="monthly">🗓️ Monthly</option>
                </select>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 mt-7">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              id="task-save-btn"
              type="button"
              onClick={() => { setError(''); mutation.mutate() }}
              disabled={!form.title || !form.deadline || mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending && (
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              )}
              {mutation.isPending ? 'Saving...' : task ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonModal>
  )
}

export default TaskFormModal
