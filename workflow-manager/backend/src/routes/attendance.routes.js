import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { create, list, update, remove } from '../controllers/attendance.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', list);

router.post(
  '/',
  authorizeRoles('admin', 'manager'),
  [
    body('employeeId').isInt(),
    body('checkIn').isISO8601(),
    body('checkOut').optional().isISO8601(),
  ],
  create
);

router.put('/:id', authorizeRoles('admin', 'manager'), update);
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
