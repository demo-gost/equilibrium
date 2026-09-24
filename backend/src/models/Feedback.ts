import mongoose, { Document, Schema } from 'mongoose';

export type FeedbackType =
  | 'TASK_COMPLETED'
  | 'EXTEND_TIME'
  | 'TASK_SKIPPED'
  | 'TASK_RESCHEDULED'
  | 'SCHEDULE_OVERRIDE'
  | 'WORKLOAD_FEEDBACK'
  | 'VIBE_CHECK'
  | 'DIFFICULTY_FEEDBACK';

export interface IFeedback extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  scheduleBlockId?: mongoose.Types.ObjectId;
  type: FeedbackType;
  // Task completion
  actualDurationMinutes?: number;
  // Extend time
  extensionMinutes?: number;
  // Difficulty rating
  difficultyRating?: 1 | 2 | 3 | 4; // 1=Easy, 2=Medium, 3=Hard, 4=Very Hard
  // Workload feedback
  workloadRating?: 'too_light' | 'balanced' | 'heavy' | 'too_heavy';
  // Vibe check (1=Not overwhelmed, 5=Extremely overwhelmed)
  vibeScore?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  processedForML: boolean;
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    scheduleBlockId: { type: Schema.Types.ObjectId, ref: 'ScheduleBlock' },
    type: {
      type: String,
      enum: [
        'TASK_COMPLETED', 'EXTEND_TIME', 'TASK_SKIPPED',
        'TASK_RESCHEDULED', 'SCHEDULE_OVERRIDE', 'WORKLOAD_FEEDBACK',
        'VIBE_CHECK', 'DIFFICULTY_FEEDBACK',
      ],
      required: true,
    },
    actualDurationMinutes: { type: Number },
    extensionMinutes: { type: Number },
    difficultyRating: { type: Number, min: 1, max: 4 },
    workloadRating: {
      type: String,
      enum: ['too_light', 'balanced', 'heavy', 'too_heavy'],
    },
    vibeScore: { type: Number, min: 1, max: 5 },
    notes: { type: String, maxlength: 1000 },
    processedForML: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FeedbackSchema.index({ userId: 1, type: 1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
