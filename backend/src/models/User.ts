import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IBreakPreference {
  intervalMinutes: number;
  durationMinutes: number;
}

export interface ISleepSchedule {
  bedtimeHour: number;    // 0-23
  bedtimeMinute: number;  // 0-59
  wakeHour: number;
  wakeMinute: number;
}

export interface IStudyPreference {
  preferredStartHour: number;
  preferredEndHour: number;
  focusMode: 'deep' | 'pomodoro' | 'flexible';
}

export interface INotificationPreference {
  taskStartReminder: boolean;
  breakReminder: boolean;
  deadlineApproaching: boolean;
  scheduleChanged: boolean;
  dailySummary: boolean;
  reminderMinutesBefore: number;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  timezone: string;
  role: 'student' | 'admin';
  studyPreferences: IStudyPreference;
  dailyStudyLimitHours: number;
  sleepSchedule: ISleepSchedule;
  breakPreferences: IBreakPreference;
  notificationPreferences: INotificationPreference;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: { type: String, required: true, select: false },
    timezone: { type: String, default: 'UTC' },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    studyPreferences: {
      preferredStartHour: { type: Number, default: 9 },
      preferredEndHour: { type: Number, default: 22 },
      focusMode: { type: String, enum: ['deep', 'pomodoro', 'flexible'], default: 'flexible' },
    },
    dailyStudyLimitHours: { type: Number, default: 8, min: 1, max: 16 },
    sleepSchedule: {
      bedtimeHour: { type: Number, default: 23 },
      bedtimeMinute: { type: Number, default: 0 },
      wakeHour: { type: Number, default: 7 },
      wakeMinute: { type: Number, default: 0 },
    },
    breakPreferences: {
      intervalMinutes: { type: Number, default: 90 },
      durationMinutes: { type: Number, default: 15 },
    },
    notificationPreferences: {
      taskStartReminder: { type: Boolean, default: true },
      breakReminder: { type: Boolean, default: true },
      deadlineApproaching: { type: Boolean, default: true },
      scheduleChanged: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: false },
      reminderMinutesBefore: { type: Number, default: 5 },
    },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

// Index for fast email lookups
UserSchema.index({ email: 1 });

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
