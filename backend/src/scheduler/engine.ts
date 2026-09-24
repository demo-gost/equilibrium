import { ITask } from '../models/Task';
import { IUser } from '../models/User';
import { ScheduleBlock, IScheduleBlock, BlockType } from '../models/ScheduleBlock';
import logger from '../utils/logger';

export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface ScheduleResult {
  blocks: Partial<IScheduleBlock>[];
  warnings: string[];
  overflowTasks: string[];
}

/**
 * Core Scheduling Engine
 *
 * Algorithm:
 * 1. Compute protected blocks (sleep, college, existing personal)
 * 2. Identify free time slots in [fromTime, planHorizon]
 * 3. Score and sort tasks by urgency
 * 4. Greedily allocate tasks into free slots
 * 5. Insert breaks after configurable study intervals
 * 6. Insert buffer time after each task block
 * 7. Respect daily study limit
 * 8. Report overflow tasks that couldn't be scheduled
 */
export class SchedulingEngine {
  private readonly BUFFER_PERCENT = 0.15; // 15% buffer after each task
  private readonly MIN_SLOT_MINUTES = 20; // Don't bother with tiny slots

  generate(
    user: IUser,
    tasks: ITask[],
    existingBlocks: IScheduleBlock[],
    fromTime: Date,
    planDays = 7
  ): ScheduleResult {
    const warnings: string[] = [];
    const overflowTasks: string[] = [];
    const newBlocks: Partial<IScheduleBlock>[] = [];

    const horizon = new Date(fromTime);
    horizon.setDate(horizon.getDate() + planDays);

    // Score and sort tasks by urgency
    const scoredTasks = tasks
      .filter((t) => ['pending', 'in_progress'].includes(t.status))
      .map((t) => ({ task: t, score: this.urgencyScore(t, fromTime) }))
      .sort((a, b) => b.score - a.score);

    // Build protected time slots (sleep + existing blocks)
    const protectedSlots = this.buildProtectedSlots(user, existingBlocks, fromTime, horizon);

    // Track allocated study minutes per day
    const dailyStudyMinutes: Map<string, number> = new Map();
    const dailyLimitMinutes = user.dailyStudyLimitHours * 60;

    let planningCursor = new Date(fromTime);
    let lastStudyEnd: Date | null = null;
    let continuousStudyMinutes = 0;

    for (const { task } of scoredTasks) {
      const effectiveDuration = this.effectiveDuration(task);
      const bufferMinutes = Math.round(effectiveDuration * this.BUFFER_PERCENT);
      let remainingMinutes = effectiveDuration;

      // Check if task deadline is in range
      if (task.deadline < fromTime) {
        warnings.push(`Task "${task.title}" deadline has already passed`);
      }

      while (remainingMinutes > 0) {
        // Advance cursor past any protected blocks
        planningCursor = this.advancePastProtected(planningCursor, protectedSlots);

        if (planningCursor >= horizon) {
          overflowTasks.push(task.title);
          break;
        }

        // Check daily limit
        const dayKey = planningCursor.toDateString();
        const usedToday = dailyStudyMinutes.get(dayKey) || 0;
        if (usedToday >= dailyLimitMinutes) {
          // Roll to next day preferred start time
          planningCursor = this.nextDayStart(planningCursor, user);
          continue;
        }

        // Check if we need a break
        if (
          lastStudyEnd &&
          continuousStudyMinutes >= user.breakPreferences.intervalMinutes
        ) {
          const breakEnd = new Date(
            planningCursor.getTime() + user.breakPreferences.durationMinutes * 60000
          );
          // Only insert break if within available window
          if (!this.overlapsProtected(planningCursor, breakEnd, protectedSlots)) {
            newBlocks.push({
              userId: task.userId,
              startTime: new Date(planningCursor),
              endTime: breakEnd,
              scheduledDurationMinutes: user.breakPreferences.durationMinutes,
              type: 'BREAK' as BlockType,
              status: 'scheduled',
              reason: 'Auto-inserted break after study interval',
            });
            planningCursor = breakEnd;
            continuousStudyMinutes = 0;
            lastStudyEnd = null;
          }
        }

        // Find the next free window
        const freeEnd = this.findFreeWindowEnd(planningCursor, protectedSlots, task.deadline, horizon);
        if (!freeEnd) {
          overflowTasks.push(task.title);
          break;
        }

        const availableMinutes = Math.min(
          Math.round((freeEnd.getTime() - planningCursor.getTime()) / 60000),
          dailyLimitMinutes - usedToday,
          remainingMinutes
        );

        if (availableMinutes < this.MIN_SLOT_MINUTES) {
          planningCursor = freeEnd;
          continue;
        }

        const chunkMinutes = Math.min(remainingMinutes, availableMinutes);
        const blockEnd = new Date(planningCursor.getTime() + chunkMinutes * 60000);

        newBlocks.push({
          userId: task.userId,
          taskId: task._id,
          startTime: new Date(planningCursor),
          endTime: blockEnd,
          scheduledDurationMinutes: chunkMinutes,
          type: 'TASK' as BlockType,
          status: 'scheduled',
          reason: chunkMinutes < effectiveDuration ? 'Partial task block (split across time)' : undefined,
        });

        // Update tracking
        const dayKeyUsed = planningCursor.toDateString();
        dailyStudyMinutes.set(dayKeyUsed, (dailyStudyMinutes.get(dayKeyUsed) || 0) + chunkMinutes);
        continuousStudyMinutes += chunkMinutes;
        lastStudyEnd = blockEnd;
        remainingMinutes -= chunkMinutes;
        planningCursor = blockEnd;

        // Add buffer after task completion
        if (remainingMinutes === 0 && bufferMinutes > 0) {
          const bufferEnd = new Date(planningCursor.getTime() + bufferMinutes * 60000);
          if (!this.overlapsProtected(planningCursor, bufferEnd, protectedSlots)) {
            newBlocks.push({
              userId: task.userId,
              startTime: new Date(planningCursor),
              endTime: bufferEnd,
              scheduledDurationMinutes: bufferMinutes,
              type: 'BUFFER' as BlockType,
              status: 'scheduled',
              reason: `Buffer after "${task.title}"`,
            });
            planningCursor = bufferEnd;
          }
        }
      }
    }

    return { blocks: newBlocks, warnings, overflowTasks };
  }

  /**
   * Urgency score: higher = schedule sooner
   */
  urgencyScore(task: ITask, now: Date): number {
    const hoursToDeadline = Math.max(
      0.1,
      (task.deadline.getTime() - now.getTime()) / 3600000
    );

    const priorityWeight = 30;
    const deadlineWeight = 200;
    const difficultyWeight = 5;

    return (
      task.priority * priorityWeight +
      deadlineWeight / hoursToDeadline +
      task.difficulty * difficultyWeight
    );
  }

  /**
   * Effective duration = AI predicted (if available) else user estimate
   */
  effectiveDuration(task: ITask): number {
    return task.predictedDurationMinutes || task.estimatedDurationMinutes;
  }

  private buildProtectedSlots(
    user: IUser,
    existingBlocks: IScheduleBlock[],
    from: Date,
    to: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Sleep blocks for each day
    let day = new Date(from);
    day.setHours(0, 0, 0, 0);
    while (day < to) {
      // Bedtime tonight
      const bedtime = new Date(day);
      bedtime.setHours(user.sleepSchedule.bedtimeHour, user.sleepSchedule.bedtimeMinute, 0, 0);

      // Wake next morning
      const wakeTime = new Date(day);
      wakeTime.setDate(wakeTime.getDate() + 1);
      wakeTime.setHours(user.sleepSchedule.wakeHour, user.sleepSchedule.wakeMinute, 0, 0);

      slots.push({
        start: bedtime,
        end: wakeTime,
        durationMinutes: (wakeTime.getTime() - bedtime.getTime()) / 60000,
      });

      day.setDate(day.getDate() + 1);
    }

    // Existing protected blocks (COLLEGE, PERSONAL, SLEEP)
    for (const block of existingBlocks) {
      if (['COLLEGE', 'PERSONAL', 'SLEEP'].includes(block.type) && block.isProtected) {
        slots.push({
          start: block.startTime,
          end: block.endTime,
          durationMinutes: block.scheduledDurationMinutes,
        });
      }
    }

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private advancePastProtected(cursor: Date, protectedSlots: TimeSlot[]): Date {
    let result = new Date(cursor);
    let moved = true;
    while (moved) {
      moved = false;
      for (const slot of protectedSlots) {
        if (result >= slot.start && result < slot.end) {
          result = new Date(slot.end);
          moved = true;
        }
      }
    }
    return result;
  }

  private findFreeWindowEnd(
    cursor: Date,
    protectedSlots: TimeSlot[],
    deadline: Date,
    horizon: Date
  ): Date | null {
    const bound = new Date(Math.min(deadline.getTime(), horizon.getTime()));
    if (cursor >= bound) return null;

    // Find next protected slot start after cursor
    for (const slot of protectedSlots) {
      if (slot.start > cursor && slot.start < bound) {
        return slot.start;
      }
    }

    return bound;
  }

  private overlapsProtected(start: Date, end: Date, protectedSlots: TimeSlot[]): boolean {
    return protectedSlots.some((s) => start < s.end && end > s.start);
  }

  private nextDayStart(cursor: Date, user: IUser): Date {
    const next = new Date(cursor);
    next.setDate(next.getDate() + 1);
    next.setHours(user.sleepSchedule.wakeHour, user.sleepSchedule.wakeMinute, 0, 0);
    return next;
  }
}

export const schedulingEngine = new SchedulingEngine();
