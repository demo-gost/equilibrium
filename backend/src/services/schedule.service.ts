import { Task } from '../models/Task';
import { User } from '../models/User';
import { ScheduleBlock } from '../models/ScheduleBlock';
import { ActivityLog } from '../models/ActivityLog';
import { schedulingEngine } from '../scheduler/engine';
import { rescheduleService } from '../scheduler/reschedule';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class ScheduleService {
  async generateSchedule(userId: string, fromDate?: Date, planDays = 7) {
    const now = fromDate || new Date();

    const [user, tasks, existingBlocks] = await Promise.all([
      User.findById(userId),
      Task.find({ userId, status: { $in: ['pending', 'in_progress'] } }),
      ScheduleBlock.find({
        userId,
        startTime: { $gte: now },
        isProtected: true,
      }),
    ]);

    if (!user) throw createError('User not found', 404);

    // Cancel existing non-protected future blocks
    await ScheduleBlock.updateMany(
      {
        userId,
        startTime: { $gte: now },
        isProtected: false,
        status: 'scheduled',
      },
      { status: 'cancelled' }
    );

    const result = schedulingEngine.generate(user, tasks, existingBlocks, now, planDays);

    if (result.blocks.length > 0) {
      const docs = await ScheduleBlock.insertMany(
        result.blocks.map((b) => ({ ...b, userId }))
      );

      // Update scheduled times on tasks
      for (const block of docs) {
        if (block.taskId) {
          await Task.findByIdAndUpdate(block.taskId, {
            scheduledStartTime: block.startTime,
            scheduledEndTime: block.endTime,
          });
        }
      }
    }

    await ActivityLog.create({
      userId,
      action: 'schedule_generated',
      entityType: 'schedule',
      metadata: {
        blocksGenerated: result.blocks.length,
        warnings: result.warnings,
        overflowTasks: result.overflowTasks,
      },
    });

    logger.info(`Schedule generated for ${userId}: ${result.blocks.length} blocks`);
    return result;
  }

  async getSchedule(userId: string, from: Date, to: Date) {
    const blocks = await ScheduleBlock.find({
      userId,
      startTime: { $gte: from },
      endTime: { $lte: to },
      status: { $ne: 'cancelled' },
    })
      .populate('taskId', 'title category priority difficulty deadline status')
      .sort({ startTime: 1 });

    return blocks;
  }

  async getTodaySchedule(userId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.getSchedule(userId, start, end);
  }

  async addProtectedBlock(
    userId: string,
    data: {
      startTime: Date;
      endTime: Date;
      type: 'COLLEGE' | 'PERSONAL' | 'SLEEP';
      reason?: string;
    }
  ) {
    const block = await ScheduleBlock.create({
      userId,
      startTime: data.startTime,
      endTime: data.endTime,
      scheduledDurationMinutes: Math.round(
        (data.endTime.getTime() - data.startTime.getTime()) / 60000
      ),
      type: data.type,
      status: 'scheduled',
      reason: data.reason,
      isProtected: true,
    });

    return block;
  }

  async triggerReschedule(userId: string, reason: string) {
    return rescheduleService.reschedule(userId, reason as never);
  }
}

export const scheduleService = new ScheduleService();
