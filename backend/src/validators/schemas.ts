import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  timezone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(['coding', 'math', 'writing', 'reading', 'research', 'project', 'exam_prep', 'assignment', 'lab', 'other']),
  priority: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  estimatedDurationMinutes: z.number().int().min(5).max(480),
  deadline: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid deadline date'),
  tags: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(['none', 'daily', 'weekly', 'weekdays', 'monthly']).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'overdue']).optional(),
});

export const completeTaskSchema = z.object({
  actualDurationMinutes: z.number().int().min(1),
});

export const extendTaskSchema = z.object({
  extensionMinutes: z.number().int().min(5).max(240),
});

export const feedbackSchema = z.object({
  taskId: z.string().optional(),
  scheduleBlockId: z.string().optional(),
  type: z.enum([
    'TASK_COMPLETED', 'EXTEND_TIME', 'TASK_SKIPPED',
    'TASK_RESCHEDULED', 'SCHEDULE_OVERRIDE', 'WORKLOAD_FEEDBACK',
    'VIBE_CHECK', 'DIFFICULTY_FEEDBACK',
  ]),
  actualDurationMinutes: z.number().int().min(1).optional(),
  extensionMinutes: z.number().int().min(5).optional(),
  difficultyRating: z.number().int().min(1).max(4).optional(),
  workloadRating: z.enum(['too_light', 'balanced', 'heavy', 'too_heavy']).optional(),
  vibeScore: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

export const protectedBlockSchema = z.object({
  startTime: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start time'),
  endTime: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid end time'),
  type: z.enum(['COLLEGE', 'PERSONAL', 'SLEEP']),
  reason: z.string().optional(),
});
