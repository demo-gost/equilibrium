import { Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { TaskStatus } from '../models/Task';
import { rescheduleService } from '../scheduler/reschedule';
import { AuthRequest } from '../middleware/auth';
import { successResponse, paginatedResponse } from '../utils/response';

import { parseNaturalLanguageTask } from '../ai/nl-parser';

const param = (p: string | string[]): string => Array.isArray(p) ? p[0] : p;

export const parseNLTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ message: 'Input text required' });
      return;
    }
    const parsed = parseNaturalLanguageTask(input);
    const createdTask = await taskService.createTask(req.user!.userId, {
      ...parsed,
      deadline: parsed.deadline.toISOString(),
    });
    rescheduleService.reschedule(req.user!.userId, 'new_urgent_task').catch(() => {});
    res.status(201).json(successResponse(createdTask, 'Task parsed and created automatically', 201));
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.createTask(req.user!.userId, req.body);
    // Trigger reschedule to incorporate new task
    rescheduleService.reschedule(req.user!.userId, 'new_urgent_task').catch(() => {});
    res.status(201).json(successResponse(task, 'Task created', 201));
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status as TaskStatus : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const page = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
    const result = await taskService.getTasks(req.user!.userId, { status, category, page, limit });
    res.json(paginatedResponse(result.tasks, result.total, result.page, result.limit));
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.getTask(req.user!.userId, param(req.params.id));
    res.json(successResponse(task));
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.updateTask(req.user!.userId, param(req.params.id), req.body);
    rescheduleService.reschedule(req.user!.userId, 'deadline_changed').catch(() => {});
    res.json(successResponse(task, 'Task updated'));
  } catch (error) {
    next(error);
  }
};

export const completeTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { actualDurationMinutes } = req.body;
    const task = await taskService.completeTask(req.user!.userId, param(req.params.id), actualDurationMinutes);
    rescheduleService.reschedule(req.user!.userId, 'task_completed_early').catch(() => {});
    res.json(successResponse(task, 'Task completed!'));
  } catch (error) {
    next(error);
  }
};

export const extendTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { extensionMinutes } = req.body;
    const task = await taskService.extendTask(req.user!.userId, param(req.params.id), extensionMinutes);
    rescheduleService.reschedule(req.user!.userId, 'task_extended').catch(() => {});
    res.json(successResponse(task, `Task extended by ${extensionMinutes} minutes`));
  } catch (error) {
    next(error);
  }
};

export const skipTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.skipTask(req.user!.userId, param(req.params.id));
    rescheduleService.reschedule(req.user!.userId, 'task_skipped').catch(() => {});
    res.json(successResponse(task, 'Task skipped'));
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await taskService.deleteTask(req.user!.userId, param(req.params.id));
    res.json(successResponse(result, 'Task deleted'));
  } catch (error) {
    next(error);
  }
};
