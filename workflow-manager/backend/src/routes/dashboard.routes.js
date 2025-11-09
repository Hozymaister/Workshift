import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { summary } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);

router.get('/summary', summary);

export default router;
