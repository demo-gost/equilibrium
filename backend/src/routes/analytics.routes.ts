import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { feedbackSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

// Feedback
router.post('/feedback', validate(feedbackSchema), analyticsController.submitFeedback);

// Analytics
router.get('/summary', analyticsController.getAnalyticsSummary);
router.get('/trends', analyticsController.getWeeklyTrends);
router.get('/insights', analyticsController.getInsights);

export default router;
