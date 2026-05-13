import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import {
  AuthTokensInterface,
  LoginUserDataInterface,
  RegisterUserDataInterface,
} from '@/interface/authInterface';
import { ConflictError, UnauthorizedError } from '@/utils/appError';
import bcrypt from 'bcryptjs';
import { EstadoForm } from '@prisma/client';
import { Response } from 'express';


const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' ? true : false,
  sameSite: 'strict' as const,
  path: '/'
};

class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly saltRounds: number;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET!;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN!;
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN!;
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS!);
  }

  // HELPERS DE COOKIES
  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutos en ms
    });

    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
  }


  async register(
    userData: RegisterUserDataInterface
  ): Promise<any> {
    try {
      const result = await prisma.$transaction(async (tx) => {

        const existingUser = await tx.usuario.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          throw new ConflictError('El correo ingresado ya existe');
        }

        const hashedPassword = await bcrypt.hash(
          userData.password,
          this.saltRounds
        );

        const accessGlobal =
          !userData.comunidades &&
          !userData.departaments;

        const newUser = await tx.usuario.create({
          data: {
            apellidos: userData.lastName,
            email: userData.email,
            nombres: userData.firstName,
            password: hashedPassword,
            id_rol: Number(userData.role),
            accesso_global: accessGlobal
          }
        });

        if (userData.forms?.length) {
          await tx.formularioUsuario.createMany({
            data: userData.forms.map((formId: number) => ({
              id_usuario: newUser.id_usuario,
              id_formulario: formId
            }))
          });
        }

        if (!accessGlobal && userData.comunidades?.length) {
          await tx.usuarioComunidad.createMany({
            data: userData.comunidades.map((comId: number) => ({
              id_usuario: newUser.id_usuario,
              id_comunidad: comId
            }))
          });
        }

        const fullUser = await tx.usuario.findUnique({
          where: { id_usuario: newUser.id_usuario },
          select: {
            id_usuario: true,
            email: true,
            nombres: true,
            apellidos: true,
            accesso_global: true,
            estado_registro: true,
            rol: {
              select: {
                id_rol: true,
                nombre: true
              }
            },
            comunidades: {
              select: {
                comunidad: {
                  select: {
                    id_comunidad: true,
                    nombre: true,
                    departamento: {
                      select: {
                        id_departamento: true,
                        nombre: true
                      }
                    }
                  }
                }
              }
            }
          }
        });

        return fullUser;
      });

      const formattedUser = {
        idUser: result?.id_usuario,
        email: result?.email,
        firstName: result?.nombres,
        lastName: result?.apellidos,
        access_global: result?.accesso_global,
        estado_registro: result?.estado_registro,
        rol: result?.rol.nombre
      };

      return formattedUser;

    } catch (error) {
      logger.error('Error en el registro de usuario: ', error);
      throw error;
    }
  }


  async login(loginData: LoginUserDataInterface): Promise<{ user: any; tokens: AuthTokensInterface; forms: any }> {
    try {
      const user = await prisma.usuario.findFirst({
        where: { email: loginData.email, estado_registro: true },
        select: {
          id_usuario: true,
          email: true,
          password: true,
          nombres: true,
          apellidos: true,
          accesso_global: true,
          rol: {
            select: {
              nombre: true,
              permisos: {
                select: { permiso: { select: { codigo: true } } }
              }
            }
          }
        }
      });

      if (!user) throw new UnauthorizedError('Correo o contraseña incorrecto');

      const isValid = await bcrypt.compare(loginData.password, user.password);
      if (!isValid) throw new UnauthorizedError('Correo o contraseña incorrecto');

      const formularios = await this._getFormulariosForUser(user.id_usuario, user.accesso_global);
      const tokens = await this.generateTokens(user.id_usuario, user.rol.nombre, user.accesso_global);

      const userResponse = {
        idUser: user.id_usuario,
        email: user.email,
        firstName: user.nombres,
        lastName: user.apellidos,
        rol: user.rol.nombre,
        access_global: user.accesso_global,
        permissions: user.rol.permisos.map(p => p.permiso.codigo),
      };

      return { user: userResponse, tokens, forms: formularios };

    } catch (error) {
      logger.error('Error al iniciar sesión: ', error);
      throw error;
    }
  }

  async me(userId: number): Promise<{ user: any; forms: any }> {
    try {
      const user = await prisma.usuario.findFirst({
        where: { id_usuario: userId, estado_registro: true },
        select: {
          id_usuario: true,
          email: true,
          nombres: true,
          apellidos: true,
          accesso_global: true,
          rol: {
            select: {
              nombre: true,
              permisos: {
                select: { permiso: { select: { codigo: true } } }
              }
            }
          }
        }
      });

      if (!user) throw new UnauthorizedError('Usuario no encontrado');

      const formularios = await this._getFormulariosForUser(user.id_usuario, user.accesso_global);

      const userResponse = {
        idUser: user.id_usuario,
        email: user.email,
        firstName: user.nombres,
        lastName: user.apellidos,
        rol: user.rol.nombre,
        access_global: user.accesso_global,
        permissions: user.rol.permisos.map(p => p.permiso.codigo),
      };

      return { user: userResponse, forms: formularios };

    } catch (error) {
      logger.error('Error en /me: ', error);
      throw error;
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokensInterface> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as { userId: number };

      const user = await prisma.usuario.findFirst({
        where: { id_usuario: decoded.userId, estado_registro: true },
        select: {
          id_usuario: true,
          accesso_global: true,
          rol: { select: { nombre: true } }
        }
      });

      if (!user) throw new UnauthorizedError('Usuario no encontrado');

      return await this.generateTokens(user.id_usuario, user.rol.nombre, user.accesso_global);

    } catch (error) {
      throw new UnauthorizedError('Refresh token inválido o expirado');
    }
  }

  private async generateTokens(userId: number, role: string, access_global: boolean): Promise<AuthTokensInterface> {
    const accessToken = jwt.sign(
      { userId, role, access_global },
      this.jwtSecret as jwt.Secret,
      { expiresIn: this.jwtExpiresIn } as SignOptions
    );
    const refreshToken = jwt.sign(
      { userId },
      this.jwtRefreshSecret as jwt.Secret,
      { expiresIn: this.jwtRefreshExpiresIn } as SignOptions
    );
    return { accessToken, refreshToken };
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      throw new UnauthorizedError('Token Inválido');
    }
  }

  private async _getFormulariosForUser(userId: number, accesoGlobal: boolean): Promise<any[]> {
    if (accesoGlobal) {
      return prisma.formulario.findMany({
        where: {
          estado_registro: true,
          OR: [
            { estado: { not: EstadoForm.BORRADOR } },
            { estado: EstadoForm.BORRADOR, usuario_registro: userId }
          ]
        },
        select: { uuid: true, nombre: true },
        orderBy: {id_formulario: 'asc'}
      });
    }

    const [asignados, borradoresPropios] = await Promise.all([
      prisma.formularioUsuario.findMany({
        where: {
          id_usuario: userId,
          formulario: {
            estado_registro: true,
            OR: [
              { estado: { not: EstadoForm.BORRADOR } },
              { estado: EstadoForm.BORRADOR, usuario_registro: userId }
            ]
          }
        },
        select: { formulario: { select: { uuid: true, nombre: true } } }
      }),
      prisma.formulario.findMany({
        where: { estado: EstadoForm.BORRADOR, usuario_registro: userId },
        select: { uuid: true, nombre: true },
        orderBy: {id_formulario: 'asc'}
      })
    ]);

    const todosMap = new Map<any, any>();
    for (const f of [...asignados.map(a => a.formulario), ...borradoresPropios]) {
      todosMap.set(f.uuid, f);
    }
    return Array.from(todosMap.values());
  }
}

export const authService = new AuthService();
