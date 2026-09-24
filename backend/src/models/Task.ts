import mongoose, { Document, Schema } from 'mongoose';

export type TaskCategory =
  | 'coding'
  | 'math'
  | 'writing'
  | 'reading'
  | 'research'
  | 'project'
  | 'exam_prep'
  | 'assignment'
  | 'lab'
  | 'other';

export type TaskPriority = 1 | 2 | 3 | 4 | 5; // 1=lowest, 5=critical
export type TaskDifficulty = 1 | 2 | 3 | 4 | 5; // 1=easy, 5=very hard
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  estimatedDurationMinutes: number;
  predictedDurationMinutes?: number;
  actualDurationMinutes?: number;
  deadline: Date;
  status: TaskStatus;
  tags: string[];
  extensionCount: number;
  rescheduleCount: number;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ['coding', 'math', 'writing', 'reading', 'research', 'project', 'exam_prep', 'assignment', 'lab', 'other'],
      default: 'other',
    },
    priority: { type: Number, min: 1, max: 5, default: 3 },
    difficulty: { type: Number, min: 1, max: 5, default: 3 },
    estimatedDurationMinutes: { type: Number, required: true, min: 5 },
    predictedDurationMinutes: { type: Number },
    actualDurationMinutes: { type: Number },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'overdue'],
      default: 'pending',
    },
    tags: [{ type: String, trim: true }],
    extensionCount: { type: Number, default: 0 },
    rescheduleCount: { type: Number, default: 0 },
    scheduledStartTime: { type: Date },
    scheduledEndTime: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, deadline: 1 });
TaskSchema.index({ userId: 1, priority: -1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
