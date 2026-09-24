import { Task, ITask, TaskStatus } from '../models/Task';
import { TaskHistory } from '../models/TaskHistory';
import { ActivityLog } from '../models/ActivityLog';
import { createError } from '../middleware/errorHandler';
import { mlClient } from '../ai/ml-client';
import logger from '../utils/logger';
import mongoose from 'mongoose';

export interface CreateTaskDto {
  title: string;
  description?: string;
  category: ITask['category'];
  priority: number;
  difficulty: number;
  estimatedDurationMinutes: number;
  deadline: string;
  tags?: string[];
  isRecurring?: boolean;
  recurrencePattern?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly';
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  status?: TaskStatus;
}

export class TaskService {
  async createTask(userId: string, dto: CreateTaskDto) {
    // Request ML prediction if available
    let predictedDurationMinutes: number | undefined;
    try {
      const history = await this.getUserCategoryHistory(userId, dto.category);
      predictedDurationMinutes = await mlClient.predictDuration({
        taskCategory: dto.category,
        difficulty: dto.difficulty,
        estimatedDuration: dto.estimatedDurationMinutes,
        priority: dto.priority,
        historicalAvgDuration: history.avgDuration,
        historicalEstimationError: history.avgErrorPercent,
        historicalCount: history.count,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        recentWorkloadHours: 0,
      });
    } catch (error) {
      logger.warn('ML prediction unavailable, using estimate:', error);
    }

    const task = new Task({
      userId,
      ...dto,
      deadline: new Date(dto.deadline),
      predictedDurationMinutes,
    });

    await task.save();

    await ActivityLog.create({
      userId,
      action: 'task_created',
      entityType: 'task',
      entityId: task._id,
      metadata: { title: dto.title, category: dto.category },
    });

    logger.info(`Task created: ${task._id} for user ${userId}`);
    return task;
  }

  async getTasks(
    userId: string,
    filters: {
      status?: TaskStatus;
      category?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, category, page = 1, limit = 20 } = filters;
    const query: Record<string, unknown> = { userId };
    if (status) query.status = status;
    if (category) query.category = category;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort({ priority: -1, deadline: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Task.countDocuments(query),
    ]);

    return { tasks, total, page, limit };
  }

  async getTask(userId: string, taskId: string) {
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) throw createError('Task not found', 404);
    return task;
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { ...dto, ...(dto.deadline ? { deadline: new Date(dto.deadline) } : {}) },
      { new: true, runValidators: true }
    );
    if (!task) throw createError('Task not found', 404);

    await ActivityLog.create({
      userId,
      action: 'task_updated',
      entityType: 'task',
      entityId: task._id,
    });

    return task;
  }

  async completeTask(userId: string, taskId: string, actualDurationMinutes: number) {
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) throw createError('Task not found', 404);
    if (task.status === 'completed') throw createError('Task already completed', 400);

    const now = new Date();
    task.status = 'completed';
    task.actualDurationMinutes = actualDurationMinutes;
    task.completedAt = now;
    await task.save();

    // Spawn next occurrence if recurring
    if (task.isRecurring && task.recurrencePattern && task.recurrencePattern !== 'none') {
      const nextDeadline = new Date(task.deadline);
      if (task.recurrencePattern === 'daily') {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      } else if (task.recurrencePattern === 'weekly') {
        nextDeadline.setDate(nextDeadline.getDate() + 7);
      } else if (task.recurrencePattern === 'weekdays') {
        const day = nextDeadline.getDay();
        const addDays = day === 5 ? 3 : day === 6 ? 2 : 1;
        nextDeadline.setDate(nextDeadline.getDate() + addDays);
      } else if (task.recurrencePattern === 'monthly') {
        nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      }

      await this.createTask(userId, {
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        difficulty: task.difficulty,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
        deadline: nextDeadline.toISOString(),
        tags: task.tags,
        isRecurring: true,
        recurrencePattern: task.recurrencePattern,
      }).catch((err) => logger.error('Failed to create recurring task instance:', err));
    }

    // Record history for ML training
    const estimationError = ((actualDurationMinutes - task.estimatedDurationMinutes) / task.estimatedDurationMinutes) * 100;
    const predictionError = task.predictedDurationMinutes
      ? ((actualDurationMinutes - task.predictedDurationMinutes) / task.predictedDurationMinutes) * 100
      : undefined;

    const scheduledEnd = task.scheduledEndTime || now;
    const delayMinutes = Math.max(0, Math.round((now.getTime() - scheduledEnd.getTime()) / 60000));
    const completionStatus = delayMinutes <= 5 ? 'on_time' : delayMinutes < 0 ? 'early' : 'delayed';

    await TaskHistory.create({
      userId,
      taskId: task._id,
      taskTitle: task.title,
      category: task.category,
      difficulty: task.difficulty,
      priority: task.priority,
      estimatedDurationMinutes: task.estimatedDurationMinutes,
      predictedDurationMinutes: task.predictedDurationMinutes,
      actualDurationMinutes,
      estimationErrorPercent: estimationError,
      predictionErrorPercent: predictionError,
      delayMinutes,
      completionStatus,
      extensionCount: task.extensionCount,
      rescheduleCount: task.rescheduleCount,
      timeOfDay: (task.scheduledStartTime || now).getHours(),
      dayOfWeek: (task.scheduledStartTime || now).getDay(),
      weeklyWorkloadHours: 0,
    });

    await ActivityLog.create({
      userId,
      action: 'task_completed',
      entityType: 'task',
      entityId: task._id,
      metadata: { actualDurationMinutes, estimationError },
    });

    return task;
  }

  async extendTask(userId: string, taskId: string, extensionMinutes: number) {
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) throw createError('Task not found', 404);

    task.estimatedDurationMinutes += extensionMinutes;
    task.extensionCount += 1;
    await task.save();

    await ActivityLog.create({
      userId,
      action: 'task_extended',
      entityType: 'task',
      entityId: task._id,
      metadata: { extensionMinutes, newTotal: task.estimatedDurationMinutes },
    });

    return task;
  }

  async skipTask(userId: string, taskId: string) {
    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { status: 'skipped' },
      { new: true }
    );
    if (!task) throw createError('Task not found', 404);

    await ActivityLog.create({
      userId,
      action: 'task_skipped',
      entityType: 'task',
      entityId: task._id,
    });

    return task;
  }

  async deleteTask(userId: string, taskId: string) {
    const task = await Task.findOneAndDelete({ _id: taskId, userId });
    if (!task) throw createError('Task not found', 404);

    await ActivityLog.create({
      userId,
      action: 'task_deleted',
      entityType: 'task',
      entityId: new mongoose.Types.ObjectId(taskId),
    });

    return { deleted: true };
  }

  async getUserCategoryHistory(userId: string, category: string) {
    const history = await TaskHistory.find({ userId, category })
      .sort({ createdAt: -1 })
      .limit(20);

    if (history.length === 0) {
      return { count: 0, avgDuration: 0, avgErrorPercent: 0 };
    }

    const avgDuration = history.reduce((s, h) => s + h.actualDurationMinutes, 0) / history.length;
    const avgErrorPercent = history.reduce((s, h) => s + h.estimationErrorPercent, 0) / history.length;

    return { count: history.length, avgDuration, avgErrorPercent };
  }
}

export const taskService = new TaskService();
