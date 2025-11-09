import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { create, list, get, update, remove } from '../controllers/employee.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', list);
router.get('/:id', get);

router.post(
  '/',
  authorizeRoles('admin', 'manager'),
  [
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('email').isEmail(),
    body('position').notEmpty(),
    body('hourlyRate').isFloat({ min: 0 }),
  ],
  create
);

router.put('/:id', authorizeRoles('admin', 'manager'), update);
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
