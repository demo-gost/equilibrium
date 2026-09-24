import mongoose, { Document, Schema } from 'mongoose';

export type ActivityAction =
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_extended'
  | 'task_skipped'
  | 'task_deleted'
  | 'schedule_generated'
  | 'schedule_modified'
  | 'schedule_overridden'
  | 'deadline_missed'
  | 'feedback_submitted'
  | 'user_registered'
  | 'user_login'
  | 'user_logout'
  | 'preferences_updated';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: ActivityAction;
  entityType?: 'task' | 'schedule' | 'user' | 'feedback';
  entityId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: [
        'task_created', 'task_updated', 'task_completed', 'task_extended',
        'task_skipped', 'task_deleted', 'schedule_generated', 'schedule_modified',
        'schedule_overridden', 'deadline_missed', 'feedback_submitted',
        'user_registered', 'user_login', 'user_logout', 'preferences_updated',
      ],
      required: true,
    },
    entityType: { type: String, enum: ['task', 'schedule', 'user', 'feedback'] },
    entityId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, action: 1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
