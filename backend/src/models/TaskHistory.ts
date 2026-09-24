import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskHistory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  taskTitle: string;
  category: string;
  difficulty: number;
  priority: number;
  estimatedDurationMinutes: number;
  predictedDurationMinutes?: number;
  actualDurationMinutes: number;
  estimationErrorPercent: number; // (actual - estimated) / estimated * 100
  predictionErrorPercent?: number;
  delayMinutes: number; // Time after scheduled end before task completed
  completionStatus: 'on_time' | 'delayed' | 'early' | 'incomplete';
  extensionCount: number;
  rescheduleCount: number;
  timeOfDay: number; // 0-23 (hour when task was started)
  dayOfWeek: number; // 0-6
  weeklyWorkloadHours: number; // Total hours scheduled that week
  createdAt: Date;
}

const TaskHistorySchema = new Schema<ITaskHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    taskTitle: { type: String, required: true },
    category: { type: String, required: true },
    difficulty: { type: Number, required: true },
    priority: { type: Number, required: true },
    estimatedDurationMinutes: { type: Number, required: true },
    predictedDurationMinutes: { type: Number },
    actualDurationMinutes: { type: Number, required: true },
    estimationErrorPercent: { type: Number, required: true },
    predictionErrorPercent: { type: Number },
    delayMinutes: { type: Number, default: 0 },
    completionStatus: {
      type: String,
      enum: ['on_time', 'delayed', 'early', 'incomplete'],
      required: true,
    },
    extensionCount: { type: Number, default: 0 },
    rescheduleCount: { type: Number, default: 0 },
    timeOfDay: { type: Number, required: true },
    dayOfWeek: { type: Number, required: true },
    weeklyWorkloadHours: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TaskHistorySchema.index({ userId: 1, category: 1 });
TaskHistorySchema.index({ userId: 1, createdAt: -1 });

export const TaskHistory = mongoose.model<ITaskHistory>('TaskHistory', TaskHistorySchema);
