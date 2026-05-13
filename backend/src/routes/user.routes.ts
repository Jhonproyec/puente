import { userController } from '@/controllers/userController';
// import { authenticateToken } from '@/middleware/authMiddleware';
// import { validate } from '@/middleware/validationMiddleware';
// import { changePassword } from '@/schemas/validation.schemas';
import { Router } from 'express';

export const userRoutes = Router();

// userRoutes.get('/profile', authenticateToken, userController.getProfile);
userRoutes.put('/update', userController.updateProfile);
userRoutes.get('/', userController.getAllUsers);
userRoutes.get('/:userId', userController.getUserById);
userRoutes.delete('/',  userController.deleteUser);
// userRoutes.put('/changePassword', validate(changePassword), userController.changePassword);
 