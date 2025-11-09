import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { overview } from '../controllers/finance.controller.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin', 'manager'));

router.get('/overview', overview);

export default router;
