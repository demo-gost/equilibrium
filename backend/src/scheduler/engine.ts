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
  private readonly MIN_SLOT_MINUTES = 5; // Allow small slots for 15-min tasks

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
      .filter((t) => ['pending', 'in_progress', 'overdue'].includes(t.status))
      .map((t) => ({ task: t, score: this.urgencyScore(t, fromTime) }))
      .sort((a, b) => b.score - a.score);

    const bHour = user.sleepSchedule?.bedtimeHour ?? 23;
    const bMin = user.sleepSchedule?.bedtimeMinute ?? 0;
    const wHour = user.sleepSchedule?.wakeHour ?? 7;
    const wMin = user.sleepSchedule?.wakeMinute ?? 0;

    // Build protected time slots (sleep + quiet non-study hours + existing blocks)
    const protectedSlots = this.buildProtectedSlots(user, existingBlocks, fromTime, horizon);

    // 1. Generate visible SLEEP blocks for each day in the plan horizon
    let sleepCursor = new Date(fromTime);
    sleepCursor.setDate(sleepCursor.getDate() - 1);
    sleepCursor.setHours(0, 0, 0, 0);
    while (sleepCursor < horizon) {
      const bedtime = new Date(sleepCursor);
      bedtime.setHours(bHour, bMin, 0, 0);

      const wakeTime = new Date(sleepCursor);
      if (bHour >= wHour) {
        wakeTime.setDate(wakeTime.getDate() + 1);
      }
      wakeTime.setHours(wHour, wMin, 0, 0);

      if (wakeTime > fromTime && bedtime < horizon) {
        const sStart = bedtime < fromTime ? fromTime : bedtime;
        const dur = Math.round((wakeTime.getTime() - sStart.getTime()) / 60000);
        if (dur > 0 && dur <= 24 * 60) {
          newBlocks.push({
            userId: user._id,
            startTime: sStart,
            endTime: wakeTime,
            scheduledDurationMinutes: dur,
            type: 'SLEEP' as BlockType,
            status: 'scheduled',
            isProtected: false,
            reason: '🌙 Sleep Schedule',
          });
        }
      }

      sleepCursor.setDate(sleepCursor.getDate() + 1);
    }

    // Determine break preferences based on Focus Mode
    let breakInterval = user.breakPreferences?.intervalMinutes ?? 90;
    let breakDuration = user.breakPreferences?.durationMinutes ?? 15;
    if (user.studyPreferences?.focusMode === 'pomodoro') {
      breakInterval = 25;
      breakDuration = 5;
    } else if (user.studyPreferences?.focusMode === 'deep') {
      breakInterval = 90;
      breakDuration = 15;
    }

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
      const taskBlocks: Partial<IScheduleBlock>[] = [];

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
          continuousStudyMinutes >= breakInterval
        ) {
          const breakEnd = new Date(
            planningCursor.getTime() + breakDuration * 60000
          );
          // Only insert break if within available window
          if (!this.overlapsProtected(planningCursor, breakEnd, protectedSlots)) {
            newBlocks.push({
              userId: task.userId,
              startTime: new Date(planningCursor),
              endTime: breakEnd,
              scheduledDurationMinutes: breakDuration,
              type: 'BREAK' as BlockType,
              status: 'scheduled',
              reason: `Auto break (${user.studyPreferences?.focusMode || 'standard'} mode)`,
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

        const minSlotRequired = Math.min(remainingMinutes, this.MIN_SLOT_MINUTES);
        if (availableMinutes < minSlotRequired) {
          planningCursor = freeEnd;
          continue;
        }

        const chunkMinutes = Math.min(remainingMinutes, availableMinutes);
        const blockEnd = new Date(planningCursor.getTime() + chunkMinutes * 60000);

        taskBlocks.push({
          userId: task.userId,
          taskId: task._id,
          startTime: new Date(planningCursor),
          endTime: blockEnd,
          scheduledDurationMinutes: chunkMinutes,
          type: 'TASK' as BlockType,
          status: 'scheduled',
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

      if (taskBlocks.length > 1) {
        const total = taskBlocks.length;
        taskBlocks.forEach((b, idx) => {
          b.reason = `Part ${idx + 1} of ${total}`;
        });
      }

      newBlocks.push(...taskBlocks);
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

    let pStart = user.studyPreferences?.preferredStartHour ?? 9;
    let pEnd = user.studyPreferences?.preferredEndHour ?? 22;
    let bHour = user.sleepSchedule?.bedtimeHour ?? 23;
    let bMin = user.sleepSchedule?.bedtimeMinute ?? 0;
    let wHour = user.sleepSchedule?.wakeHour ?? 7;
    let wMin = user.sleepSchedule?.wakeMinute ?? 0;

    // Sanity defaults to prevent invalid ranges from locking out the 24h day
    if (typeof pStart !== 'number' || pStart < 0 || pStart > 23) pStart = 9;
    if (typeof pEnd !== 'number' || pEnd < 0 || pEnd > 23) pEnd = 22;
    if (pEnd <= pStart) {
      pStart = 9;
      pEnd = 22;
    }
    if (typeof bHour !== 'number' || bHour < 0 || bHour > 23) bHour = 23;
    if (typeof wHour !== 'number' || wHour < 0 || wHour > 23) wHour = 7;

    let day = new Date(from);
    day.setDate(day.getDate() - 1);
    day.setHours(0, 0, 0, 0);
    while (day < to) {
      // 1. Off-limits Sleep interval for this date
      const bedtime = new Date(day);
      bedtime.setHours(bHour, bMin, 0, 0);

      const wakeTime = new Date(day);
      if (bHour >= wHour) {
        wakeTime.setDate(wakeTime.getDate() + 1);
      }
      wakeTime.setHours(wHour, wMin, 0, 0);

      if (wakeTime > bedtime) {
        slots.push({
          start: bedtime,
          end: wakeTime,
          durationMinutes: (wakeTime.getTime() - bedtime.getTime()) / 60000,
        });
      }

      // 2. Off-limits quiet non-study hours (study end to next morning study start)
      const quietStart = new Date(day);
      quietStart.setHours(pEnd, 0, 0, 0);

      const quietEnd = new Date(day);
      quietEnd.setDate(quietEnd.getDate() + 1);
      quietEnd.setHours(pStart, 0, 0, 0);

      if (quietEnd > quietStart) {
        slots.push({
          start: quietStart,
          end: quietEnd,
          durationMinutes: (quietEnd.getTime() - quietStart.getTime()) / 60000,
        });
      }

      day.setDate(day.getDate() + 1);
    }

    // Existing protected blocks (COLLEGE, PERSONAL, SLEEP)
    for (const block of existingBlocks) {
      if (['COLLEGE', 'PERSONAL', 'SLEEP'].includes(block.type) && block.isProtected) {
        slots.push({
          start: new Date(block.startTime),
          end: new Date(block.endTime),
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
    const effectiveDeadline = deadline > cursor ? deadline : horizon;
    const bound = new Date(Math.min(effectiveDeadline.getTime(), horizon.getTime()));
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
    const startHour = Math.max(user.studyPreferences?.preferredStartHour ?? 9, user.sleepSchedule?.wakeHour ?? 7);
    next.setHours(startHour, 0, 0, 0);
    return next;
  }
}

export const schedulingEngine = new SchedulingEngine();
