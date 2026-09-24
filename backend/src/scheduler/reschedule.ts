import { Task } from '../models/Task';
import { User } from '../models/User';
import { ScheduleBlock } from '../models/ScheduleBlock';
import { ActivityLog } from '../models/ActivityLog';
import { schedulingEngine } from './engine';
import { sseManager } from '../utils/sse';
import logger from '../utils/logger';

export type RescheduleReason =
  | 'task_extended'
  | 'task_completed_early'
  | 'task_skipped'
  | 'new_urgent_task'
  | 'deadline_changed'
  | 'availability_changed'
  | 'manual';

/**
 * Dynamic Rescheduling Engine
 *
 * Triggered whenever a disruption occurs. It:
 * 1. Cancels all future TASK and BUFFER blocks from now
 * 2. Re-runs the scheduling engine on remaining tasks
 * 3. Persists the new blocks
 * 4. Pushes SSE event to the frontend
 */
export class RescheduleService {
  async reschedule(userId: string, reason: RescheduleReason): Promise<{
    cancelledCount: number;
    newBlocksCount: number;
    warnings: string[];
    overflowTasks: string[];
  }> {
    const now = new Date();
    logger.info(`Rescheduling for user ${userId}, reason: ${reason}`);

    // 1. Cancel all future moveable blocks
    const cancelResult = await ScheduleBlock.updateMany(
      {
        userId,
        startTime: { $gte: now },
        type: { $in: ['TASK', 'BUFFER', 'BREAK'] },
        status: { $in: ['scheduled'] },
        isProtected: false,
      },
      { status: 'cancelled' }
    );

    // 2. Fetch remaining tasks
    const [tasks, user, existingBlocks] = await Promise.all([
      Task.find({ userId, status: { $in: ['pending', 'in_progress'] } }),
      User.findById(userId),
      ScheduleBlock.find({
        userId,
        startTime: { $gte: now },
        status: { $in: ['scheduled', 'in_progress'] },
      }),
    ]);

    if (!user) {
      logger.error(`User not found during reschedule: ${userId}`);
      return { cancelledCount: 0, newBlocksCount: 0, warnings: ['User not found'], overflowTasks: [] };
    }

    // 3. Generate new schedule
    const result = schedulingEngine.generate(user, tasks, existingBlocks, now, 7);

    // 4. Persist new blocks
    if (result.blocks.length > 0) {
      await ScheduleBlock.insertMany(
        result.blocks.map((b) => ({ ...b, userId }))
      );

      // Update task scheduled times
      for (const block of result.blocks) {
        if (block.taskId) {
          await Task.findByIdAndUpdate(block.taskId, {
            scheduledStartTime: block.startTime,
            scheduledEndTime: block.endTime,
          });
        }
      }
    }

    // 5. Log activity
    await ActivityLog.create({
      userId,
      action: 'schedule_modified',
      entityType: 'schedule',
      metadata: {
        reason,
        cancelledCount: cancelResult.modifiedCount,
        newBlocksCount: result.blocks.length,
        warnings: result.warnings,
        overflowTasks: result.overflowTasks,
      },
    });

    // 6. Push SSE notification to connected clients
    sseManager.sendToUser(userId, {
      type: 'SCHEDULE_UPDATED',
      payload: {
        reason,
        newBlocksCount: result.blocks.length,
        warnings: result.warnings,
        overflowTasks: result.overflowTasks,
        timestamp: now.toISOString(),
      },
    });

    logger.info(
      `Reschedule complete for ${userId}: cancelled=${cancelResult.modifiedCount}, new=${result.blocks.length}`
    );

    return {
      cancelledCount: cancelResult.modifiedCount,
      newBlocksCount: result.blocks.length,
      warnings: result.warnings,
      overflowTasks: result.overflowTasks,
    };
  }
}

export const rescheduleService = new RescheduleService();
