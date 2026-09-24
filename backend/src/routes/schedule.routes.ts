import { Router, Request, Response, NextFunction } from 'express';
import * as scheduleController from '../controllers/schedule.controller';
import { validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';
import { protectedBlockSchema } from '../validators/schemas';
import { verifyAccessToken } from '../utils/tokens';
import { errorResponse } from '../utils/response';

const router = Router();

// SSE — token via query param (EventSource doesn't support headers)
const sseAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.query.token as string;
  if (!token) {
    res.status(401).json(errorResponse('Token required', 401));
    return;
  }
  try {
    (req as AuthRequest).user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json(errorResponse('Invalid token', 401));
  }
};

router.get('/sse', sseAuth, (req, res) => {
  scheduleController.scheduleSSE(req as AuthRequest, res);
});

router.use(authenticate);

router.post('/generate', scheduleController.generateSchedule);
router.get('/', scheduleController.getSchedule);
router.get('/today', scheduleController.getTodaySchedule);
router.post('/reschedule', scheduleController.triggerReschedule);
router.post('/protected-block', validate(protectedBlockSchema), scheduleController.addProtectedBlock);

export default router;
