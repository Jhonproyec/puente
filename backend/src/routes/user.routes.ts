import { userController } from '@/controllers/userController';
import { Router } from 'express';

export const userRoutes = Router();

userRoutes.put('/update', userController.updateProfile);
userRoutes.get('/', userController.getAllUsers);
userRoutes.put('/me/name', userController.updateMyName);
userRoutes.put('/me/password', userController.changePassword);
userRoutes.get('/:userId/qr', userController.generarQrUsuario);
userRoutes.get('/:userId', userController.getUserById);
userRoutes.delete('/',  userController.deleteUser);
