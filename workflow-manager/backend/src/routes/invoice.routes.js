import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { create, list, get, update, remove } from '../controllers/invoice.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles('admin', 'manager'), list);
router.get('/:id', authorizeRoles('admin', 'manager'), get);

router.post(
  '/',
  authorizeRoles('admin', 'manager'),
  [
    body('number').notEmpty(),
    body('issueDate').isISO8601(),
    body('dueDate').isISO8601(),
    body('amount').isFloat({ min: 0 }),
  ],
  create
);

router.put('/:id', authorizeRoles('admin', 'manager'), update);
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
