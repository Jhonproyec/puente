// import { AuthenticatedRequestInterface } from '@/interface/authInterface';
import { ApiResponseInterface } from '@/interface/apiResponseInterface';
import { UserPayloadInterface } from '@/interface/authInterface';
import { userService } from '@/services/user.service';
import { Request, Response, NextFunction } from 'express';

class UserController {

  async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, firstName, lastName, email, role, departamentos, comunidades, forms, dpi } = req.body;
      const data: UserPayloadInterface = {
        idUser: userId,
        firstName,
        lastName,
        email,
        rol: role,
        deparaments: departamentos,
        comunidades: comunidades,
        forms,
        isActive: true,
        dpi
      };
      const updatedUser = await userService.updateUserProfile(userId, data);
      const response: ApiResponseInterface = {
        success: true,
        message: "Usuario editado correctamente",
        data: updatedUser
      }
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await userService.getUserById(Number(userId));

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Usuario no encontrado',
            statusCode: 404,
          },
        });

        throw new Error('Usuario no encontrado');
      }

      res.status(200).json({
        success: true,
        message: 'Información de usuario cargada correctamente',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await userService.getAllUsers(page, limit);

      res.status(200).json({
        success: true,
        message: 'Usuarios Enviados',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.query;

      await userService.deleteUser(Number(userId));

      res.status(200).json({
        success: true,
        message: 'Usuario eliminado correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async generarQrUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await userService.generarQrUsuarioOnDemand(Number(userId));
      res.status(200).json({
        success: true,
        message: 'QR generado',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMyName(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, nombres, apellidos } = req.body;
      console.log("El body", req.body);
      await userService.updateMyName(Number(userId), nombres, apellidos);
      res.status(200).json({ success: true, message: 'Nombre actualizado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      await userService.changePassword(Number(userId), currentPassword, newPassword);
      res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
