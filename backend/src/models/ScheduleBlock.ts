import mongoose, { Document, Schema } from 'mongoose';

export type BlockType = 'TASK' | 'BREAK' | 'SLEEP' | 'COLLEGE' | 'PERSONAL' | 'BUFFER';
export type BlockStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled' | 'overrun';

export interface IScheduleBlock extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  scheduledDurationMinutes: number;
  type: BlockType;
  status: BlockStatus;
  reason?: string;
  isProtected: boolean; // Cannot be moved by auto-scheduler
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleBlockSchema = new Schema<IScheduleBlock>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    scheduledDurationMinutes: { type: Number, required: true },
    type: {
      type: String,
      enum: ['TASK', 'BREAK', 'SLEEP', 'COLLEGE', 'PERSONAL', 'BUFFER'],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'skipped', 'cancelled', 'overrun'],
      default: 'scheduled',
    },
    reason: { type: String },
    isProtected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ScheduleBlockSchema.index({ userId: 1, startTime: 1 });
ScheduleBlockSchema.index({ userId: 1, startTime: 1, endTime: 1 });
ScheduleBlockSchema.index({ taskId: 1 });

export const ScheduleBlock = mongoose.model<IScheduleBlock>('ScheduleBlock', ScheduleBlockSchema);
