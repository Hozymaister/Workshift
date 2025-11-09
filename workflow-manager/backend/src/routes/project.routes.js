import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { create, list, get, update, remove } from '../controllers/project.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', list);
router.get('/:id', get);

router.post(
  '/',
  authorizeRoles('admin', 'manager'),
  [
    body('name').notEmpty(),
    body('clientId').optional().isInt(),
  ],
  create
);

router.put('/:id', authorizeRoles('admin', 'manager'), update);
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
