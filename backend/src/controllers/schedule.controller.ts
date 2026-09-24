import { Response, NextFunction } from 'express';
import { scheduleService } from '../services/schedule.service';
import { AuthRequest } from '../middleware/auth';
import { successResponse } from '../utils/response';
import { sseManager } from '../utils/sse';
import logger from '../utils/logger';

export const generateSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fromDate, planDays } = req.body;
    const result = await scheduleService.generateSchedule(
      req.user!.userId,
      fromDate ? new Date(fromDate) : undefined,
      planDays || 7
    );
    res.json(successResponse(result, 'Schedule generated'));
  } catch (error) {
    next(error);
  }
};

export const getSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from as string) : new Date();
    const toDate = to
      ? new Date(to as string)
      : new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const blocks = await scheduleService.getSchedule(req.user!.userId, fromDate, toDate);
    res.json(successResponse(blocks));
  } catch (error) {
    next(error);
  }
};

export const getTodaySchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const blocks = await scheduleService.getTodaySchedule(req.user!.userId);
    res.json(successResponse(blocks));
  } catch (error) {
    next(error);
  }
};

export const addProtectedBlock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const block = await scheduleService.addProtectedBlock(req.user!.userId, {
      ...req.body,
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime),
    });
    res.status(201).json(successResponse(block, 'Protected block added', 201));
  } catch (error) {
    next(error);
  }
};

export const triggerReschedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await scheduleService.triggerReschedule(
      req.user!.userId,
      req.body.reason || 'manual'
    );
    res.json(successResponse(result, 'Schedule recalculated'));
  } catch (error) {
    next(error);
  }
};

/**
 * SSE endpoint — clients subscribe here to receive real-time schedule updates
 */
export const scheduleSSE = (req: AuthRequest, res: Response): void => {
  const userId = req.user!.userId;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx: disable buffering
  res.flushHeaders();

  sseManager.addClient(userId, res);
  logger.info(`SSE subscribed: user ${userId}`);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseManager.removeClient(userId, res);
    logger.info(`SSE disconnected: user ${userId}`);
  });
};
