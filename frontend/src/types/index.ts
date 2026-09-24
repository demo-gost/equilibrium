// ─── User ─────────────────────────────────────────────────────
export interface StudyPreferences {
  preferredStartHour: number;
  preferredEndHour: number;
  focusMode: 'deep' | 'pomodoro' | 'flexible';
}

export interface SleepSchedule {
  bedtimeHour: number;
  bedtimeMinute: number;
  wakeHour: number;
  wakeMinute: number;
}

export interface BreakPreference {
  intervalMinutes: number;
  durationMinutes: number;
}

export interface NotificationPreference {
  taskStartReminder: boolean;
  breakReminder: boolean;
  deadlineApproaching: boolean;
  scheduleChanged: boolean;
  dailySummary: boolean;
  reminderMinutesBefore: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  timezone: string;
  role: 'student' | 'admin';
  studyPreferences: StudyPreferences;
  dailyStudyLimitHours: number;
  sleepSchedule: SleepSchedule;
  breakPreferences: BreakPreference;
  notificationPreferences: NotificationPreference;
  createdAt: string;
}

// ─── Task ─────────────────────────────────────────────────────
export type TaskCategory =
  | 'coding' | 'math' | 'writing' | 'reading' | 'research'
  | 'project' | 'exam_prep' | 'assignment' | 'lab' | 'other';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue';

export interface Task {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedDurationMinutes: number;
  predictedDurationMinutes?: number;
  actualDurationMinutes?: number;
  deadline: string;
  status: TaskStatus;
  tags: string[];
  extensionCount: number;
  rescheduleCount: number;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Schedule ─────────────────────────────────────────────────
export type BlockType = 'TASK' | 'BREAK' | 'SLEEP' | 'COLLEGE' | 'PERSONAL' | 'BUFFER';
export type BlockStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled' | 'overrun';

export interface ScheduleBlock {
  _id: string;
  userId: string;
  taskId?: Task | string;
  startTime: string;
  endTime: string;
  scheduledDurationMinutes: number;
  type: BlockType;
  status: BlockStatus;
  reason?: string;
  isProtected: boolean;
  createdAt: string;
}

// ─── Analytics ────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgEstimationErrorPercent: number;
  avgActualDurationMinutes: number;
  scheduleAdherenceRate: number;
  extensionRate: number;
  rescheduleRate: number;
  deadlineMissRate: number;
  sustainableOnTimeRate: number;
  latestVibeScore?: number;
}

export interface WeeklyTrend {
  week: string;
  completedTasks: number;
  totalHoursStudied: number;
  avgVibeScore: number;
  avgEstimationError: number;
}

// ─── Feedback ─────────────────────────────────────────────────
export type FeedbackType =
  | 'TASK_COMPLETED' | 'EXTEND_TIME' | 'TASK_SKIPPED'
  | 'TASK_RESCHEDULED' | 'SCHEDULE_OVERRIDE' | 'WORKLOAD_FEEDBACK'
  | 'VIBE_CHECK' | 'DIFFICULTY_FEEDBACK';

// ─── API ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
