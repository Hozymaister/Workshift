import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { create } from '../controllers/report.controller.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin', 'manager'));

router.post(
  '/summary',
  [
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  create
);

export default router;
