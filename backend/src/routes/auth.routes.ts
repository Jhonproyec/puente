import { authController } from '@/controllers/authController';
// import { authenticateToken } from '@/middleware/authMiddleware';
// import { validate } from '@/middleware/validationMiddleware';
// import { loginSchema } from '@/schemas/validation.schemas';
import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/login',   authController.login.bind(authController));
authRouter.get('/me',       authController.me.bind(authController));
authRouter.post('/refresh', authController.refresh.bind(authController));
authRouter.post('/logout',  authController.logout.bind(authController));
authRouter.post('/register', authController.register.bind(authController));
// authRouter.post('/verify', authController.verifyToken);
// authRouter.get('/profile', authenticateToken, authController.getProfile);
