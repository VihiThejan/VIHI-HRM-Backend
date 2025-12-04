import { Router } from 'express';
import { register, login, getMe, logout, resetPassword } from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateLogin, handleValidationErrors } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register', protect, authorize('admin', 'ceo'), register);
router.post('/login', authLimiter, validateLogin, handleValidationErrors, login);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
