import { useState } from 'react'
import { IonModal, IonContent } from '@ionic/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Task, TaskCategory } from '../types'

interface Props {
  isOpen: boolean
  task: Task | null
  onClose: () => void
  onSaved: () => void
}

const CATEGORIES: { value: TaskCategory; label: string; icon: string }[] = [
  { value: 'coding', label: 'Coding', icon: '💻' },
  { value: 'math', label: 'Math', icon: '📐' },
  { value: 'writing', label: 'Writing', icon: '✍️' },
  { value: 'reading', label: 'Reading', icon: '📚' },
  { value: 'research', label: 'Research', icon: '🔍' },
  { value: 'project', label: 'Project', icon: '🚀' },
  { value: 'exam_prep', label: 'Exam Prep', icon: '📝' },
  { value: 'assignment', label: 'Assignment', icon: '📋' },
  { value: 'lab', label: 'Lab', icon: '🧪' },
  { value: 'other', label: 'Other', icon: '📌' },
]

const TaskFormModal = ({ isOpen, task, onClose, onSaved }: Props) => {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    category: task?.category || 'other' as TaskCategory,
    priority: task?.priority || 3,
    difficulty: task?.difficulty || 3,
    estimatedDurationMinutes: task?.estimatedDurationMinutes || 60,
    deadline: task?.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
  })
  const [error, setError] = useState('')

  // Reset when task changes
  useState(() => {
    setForm({
      title: task?.title || '',
      description: task?.description || '',
      category: task?.category || 'other',
      priority: task?.priority || 3,
      difficulty: task?.difficulty || 3,
      estimatedDurationMinutes: task?.estimatedDurationMinutes || 60,
      deadline: task?.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
    })
  })

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

  const PRIORITY_LABELS = ['', 'Low', 'Normal', 'Medium', 'High', 'Critical']
  const DIFFICULTY_LABELS = ['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard']

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonContent>
        <div className="bg-bg-secondary min-h-full px-4 pt-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary">{task ? 'Edit Task' : 'New Task'}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary p-2">✕</button>
          </div>

          {error && (
            <div className="bg-status-error/10 border border-status-error/20 text-status-error text-sm rounded-xl p-3 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label-text">Task Title *</label>
              <input
                id="task-title-input"
                className="input-field"
                placeholder="e.g., Build ML project"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </div>

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
                    onClick={() => update('category', value)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs transition-all
                      ${form.category === value
                        ? 'bg-brand-primary/20 border border-brand-primary/40 text-brand-primary'
                        : 'bg-white/3 border border-white/5 text-text-muted hover:bg-white/8'}`}
                  >
                    <span className="text-lg mb-0.5">{icon}</span>
                    <span className="truncate w-full text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Priority: <span className="text-brand-primary">{PRIORITY_LABELS[form.priority]}</span></label>
                <input type="range" min={1} max={5} value={form.priority}
                  onChange={(e) => update('priority', +e.target.value)}
                  className="w-full mt-2 accent-indigo-500" />
              </div>
              <div>
                <label className="label-text">Difficulty: <span className="text-brand-secondary">{DIFFICULTY_LABELS[form.difficulty]}</span></label>
                <input type="range" min={1} max={5} value={form.difficulty}
                  onChange={(e) => update('difficulty', +e.target.value)}
                  className="w-full mt-2 accent-violet-500" />
              </div>
            </div>

            <div>
              <label className="label-text">Estimated Duration: <span className="text-brand-accent">{form.estimatedDurationMinutes} min</span></label>
              <input type="range" min={15} max={480} step={15} value={form.estimatedDurationMinutes}
                onChange={(e) => update('estimatedDurationMinutes', +e.target.value)}
                className="w-full mt-2 accent-cyan-500" />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>15min</span><span>2h</span><span>4h</span><span>6h</span><span>8h</span>
              </div>
            </div>

            <div>
              <label className="label-text">Deadline *</label>
              <input
                id="task-deadline-input"
                type="datetime-local"
                className="input-field"
                value={form.deadline}
                onChange={(e) => update('deadline', e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              id="task-save-btn"
              onClick={() => { setError(''); mutation.mutate() }}
              disabled={!form.title || !form.deadline || mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : null}
              {mutation.isPending ? 'Saving...' : task ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonModal>
  )
}

export default TaskFormModal
