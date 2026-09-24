import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  extendTaskSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', taskController.getTasks);
router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/:id', taskController.getTask);
router.put('/:id', validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.post('/:id/complete', validate(completeTaskSchema), taskController.completeTask);
router.post('/:id/extend', validate(extendTaskSchema), taskController.extendTask);
router.post('/:id/skip', taskController.skipTask);

export default router;
