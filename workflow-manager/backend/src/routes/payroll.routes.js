import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { create, list, updateStatus, remove } from '../controllers/payroll.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles('admin', 'manager'), list);

router.post(
  '/',
  authorizeRoles('admin', 'manager'),
  [
    body('employeeId').isInt(),
    body('month').isInt({ min: 1, max: 12 }),
    body('year').isInt({ min: 2000 }),
  ],
  create
);

router.patch('/:id/status', authorizeRoles('admin'), updateStatus);
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
