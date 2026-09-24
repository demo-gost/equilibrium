import { Response, NextFunction } from 'express';
import { Feedback } from '../models/Feedback';
import { analyticsService } from '../analytics/analytics.service';
import { AuthRequest } from '../middleware/auth';
import { successResponse } from '../utils/response';

export const submitFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const feedback = await Feedback.create({
      userId: req.user!.userId,
      ...req.body,
    });
    res.status(201).json(successResponse(feedback, 'Feedback recorded', 201));
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await analyticsService.getSummary(req.user!.userId);
    res.json(successResponse(summary));
  } catch (error) {
    next(error);
  }
};

export const getWeeklyTrends = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const trends = await analyticsService.getWeeklyTrends(req.user!.userId);
    res.json(successResponse(trends));
  } catch (error) {
    next(error);
  }
};

export const getInsights = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const insights = await analyticsService.getInsights(req.user!.userId);
    res.json(successResponse(insights));
  } catch (error) {
    next(error);
  }
};
