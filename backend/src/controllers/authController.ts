// import { AuthenticatedRequestInterface } from '@/interface/authInterface';
import { ApiResponseInterface } from '@/interface/apiResponseInterface';
import { RegisterUserDataInterface } from '@/interface/authInterface';
import { authService } from '@/services/auth.service';
import { UnauthorizedError } from '@/utils/appError';
import { Request, Response, NextFunction } from 'express';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        comunidades, departamentos, email, firstName,
        forms, lastName, password, role
      } = req.body;
      const data: RegisterUserDataInterface = {
        comunidades,
        departaments: departamentos,
        email,
        firstName,
        forms,
        lastName,
        password,
        role
      }
      const result = await authService.register(data);
      const response: ApiResponseInterface = {
        success: true,
        message: 'Usuario creado correctamente',
        data: result
      }
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, tokens, forms } = await authService.login({ email, password });
      // Escribir tokens en cookies HttpOnly
      authService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      const isMobile = req.headers['x-client-type'] === 'mobile';

      console.log({
        success: true,
        message: 'Inicio de sesión correcto',
        data: {
          user,
          forms,
          ...(isMobile && {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          })
        }
      })

      res.status(200).json({
        success: true,
        message: 'Inicio de sesión correcto',
        data: {
          user,
          forms,
          ...(isMobile && {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          })
        }  // tokens ya NO van en el body para la web, somo para el mobil
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies['access_token'];
      if (!token) throw new UnauthorizedError('No autenticado');

      const decoded = await authService.verifyToken(token);
      const { user, forms } = await authService.me(decoded.userId);

      res.status(200).json({
        success: true,
        data: { user, forms }
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies['refresh_token'];
      if (!refreshToken) throw new UnauthorizedError('No hay refresh token');

      const tokens = await authService.refresh(refreshToken);

      // Renovar ambas cookies
      authService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({ success: true, message: 'Token renovado' });
    } catch (error) {
      next(error);
    }
  }

  async logout(_: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      authService.clearAuthCookies(res);
      res.status(200).json({ success: true, message: 'Sesión cerrada' });
    } catch (error) {
      next(error);
    }
  }
  // async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  //   try {
  //     const authHeader = req.headers.authorization;
  //     const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  //     if (!token) {
  //       res.status(400).json({
  //         success: false,
  //         error: {
  //           message: 'Token is required',
  //           statusCode: 400,
  //         },
  //       });
  //       throw new Error('Error al verificar el token');
  //     }

  //     const decoded = await authService.verifyToken(token);

  //     res.status(200).json({
  //       success: true,
  //       message: 'Token is valid',
  //       data: {
  //         valid: true,
  //         decoded: {
  //           userId: decoded.userId,
  //           email: decoded.email,
  //           role: decoded.role,
  //           exp: decoded.exp,
  //           iat: decoded.iat,
  //         },
  //       },
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }
}

export const authController = new AuthController();
