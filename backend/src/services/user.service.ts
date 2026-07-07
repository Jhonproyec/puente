// import { prisma } from '@/config/database';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { UserPayloadInterface } from '@/interface/authInterface';
import { UserProfileInterface } from '@/interface/userInterface';
import { ConflictError } from '@/utils/appError';
import { qrService } from './qr.service';
import { cacheService } from './cache.service';
import bcrypt from 'bcryptjs';


const ID_USUARIOS_CATALOG = `${process.env.ID_USUARIOS_CATALOG}`;
class UserService {
  async updateUserProfile(
    userId: number,
    updateData: UserPayloadInterface
  ): Promise<any> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        if (userId == 1) {
          throw new ConflictError("No tiene permisos para modificar este usuario");
        }

        const existingUser = await tx.usuario.findFirst({
          where: { email: updateData.email, estado_registro: true, id_usuario: { not: userId } }
        });

        if (existingUser) {
          throw new ConflictError('El correo ingresado ya existe');
        }

        const existingDpi = await tx.usuario.findFirst({
          where: { dpi: updateData.dpi, estado_registro: true, id_usuario: { not: userId } }
        });

        if (existingDpi) {
          throw new ConflictError('El dpi ingresado ya está asignado a un usuario');
        }

        const accessGlobal =
          !updateData.comunidades?.length &&
          !updateData.deparaments?.length;

        const updatePayload: any = {
          nombres: updateData.firstName,
          apellidos: updateData.lastName,
          email: updateData.email,
          id_rol: Number(updateData.rol),
          accesso_global: accessGlobal,
          dpi: updateData.dpi,
        };

        const newUser = await tx.usuario.update({
          where: { id_usuario: userId },
          data: updatePayload,
          include: {
            rol: true
          }
        });

        await tx.formularioUsuario.deleteMany({
          where: { id_usuario: userId }
        });

        if (updateData.forms?.length) {
          await tx.formularioUsuario.createMany({
            data: updateData.forms.map((formId: number) => ({
              id_usuario: userId,
              id_formulario: formId
            }))
          });
        }

        await tx.usuarioComunidad.deleteMany({
          where: { id_usuario: userId }
        });
        if (!accessGlobal && updateData.comunidades?.length) {
          await tx.usuarioComunidad.createMany({
            data: updateData.comunidades.map((comId: number) => ({
              id_usuario: userId,
              id_comunidad: comId
            }))
          });
        }
        return newUser;
      })

      const data = {
        idUser: result.id_usuario,
        email: result.email,
        firstName: result.nombres,
        lastName: result.apellidos,
        access_global: result.accesso_global,
        rol: result.rol.nombre,
        estado_registro: result.estado_registro,
        dpi: result.dpi,
      }
      cacheService.delete(`catalogs:item:items:${ID_USUARIOS_CATALOG}`);
      return data;

    } catch (error) {
      logger.error('Error al editar el usuario: ', error);
      throw error;
    }
  }

  async getUserById(userId: number): Promise<UserProfileInterface> {
    try {

      const user = await prisma.usuario.findUnique({
        where: { id_usuario: userId },
        select: {
          id_usuario: true,
          nombres: true,
          apellidos: true,
          accesso_global: true,
          email: true,
          dpi: true,
          rol: {
            select: {
              id_rol: true,
              nombre: true,
            }
          },
          formulariosAsignados: {
            select: {
              formulario: {
                select: {
                  id_formulario: true,
                  nombre: true,
                }
              }
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

      if (!user) {
        throw new ConflictError("Error al obtener el usuario");
      }
      const result: UserProfileInterface = {
        access_global: user.accesso_global,
        firstName: user.nombres,
        idUser: user.id_usuario,
        lastName: user.apellidos,
        rol: user.rol,
        dpi: user.dpi,
        forms: user.formulariosAsignados,
        email: user.email,
        comunidades: user.accesso_global
          ? null
          : user.comunidades.map(uc => ({
            id: uc.comunidad.id_comunidad,
            nombre: uc.comunidad.nombre,
            departamento: uc.comunidad.departamento
          }))

      }
      return result;
    } catch (error) {
      logger.error('Error al obtener el usuerio: ', error);
      throw error;
    }
  }

  async getAllUsers(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    users: any;
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.usuario.findMany({
          where: { estado_registro: true },
          skip,
          take: limit,
          orderBy: {
            fecha_creacion: 'desc'
          },
          select: {
            id_usuario: true,
            email: true,
            nombres: true,
            apellidos: true,
            accesso_global: true,
            estado_registro: true,
            dpi: true,
            rol: {
              select: {
                id_rol: true,
                nombre: true
              }
            }
          }
        }),
        prisma.usuario.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      // Transformación opcional para dejar respuesta limpia
      const formattedUsers = users.map(user => ({
        idUser: user.id_usuario,
        email: user.email,
        firstName: user.nombres,
        lastName: user.apellidos,
        access_global: user.accesso_global,
        rol: user.rol.nombre,
        estado_registro: user.estado_registro,
        dpi: user.dpi
      }));

      return {
        users: formattedUsers,
        total,
        page,
        totalPages
      };

    } catch (error) {
      logger.error('Error al obtener usuarios: ', error);
      throw error;
    }
  }
  async deleteUser(userId: number): Promise<void> {
    try {
      const user = await prisma.usuario.findUnique({
        where: { id_usuario: userId },
      });

      if (!user) {
        throw new ConflictError('Usuario no encontrado');
      }

      // Eliminar usuario
      await prisma.usuario.update({
        data: {
          estado_registro: false
        },
        where: { id_usuario: userId },
      });
      cacheService.delete(`catalogs:item:items:${ID_USUARIOS_CATALOG}`);
      logger.info(`User deleted: ${user.email}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async generarQrUsuarioOnDemand(id_usuario: number): Promise<{ qr_path: string }> {
    const usuario = await prisma.usuario.findFirst({
      where: { id_usuario: id_usuario }
    });
    if (!usuario) throw new ConflictError("Usuario no encontrado");
    if (usuario.dpi == null) throw new ConflictError("Debe ingresar el CUI para el usuario para generar el QR");

    if (usuario.qr_path) {
      return { qr_path: usuario.qr_path };
    }

    const { qr_path } = await qrService.generarQrUsuario(
      usuario.id_usuario,
      usuario.dpi,
      `${usuario.nombres} ${usuario.apellidos}`
    );

    await prisma.usuario.update({
      where: { id_usuario },
      data: { qr_path }
    });

    logger.info(`QR generado bajo demanda para usuario ${id_usuario}`);
    return { qr_path };
  }

  async updateMyName(
    userId: number,
    nombres: string,
    apellidos: string
  ): Promise<void> {
    try {
      await prisma.usuario.update({
        where: { id_usuario: userId },
        data: { nombres, apellidos }
      });
      cacheService.delete(`catalogs:item:items:${ID_USUARIOS_CATALOG}`);
      logger.info(`Nombre actualizado para usuario ${userId}`);
    } catch (error) {
      logger.error('Error al actualizar nombre:', error);
      throw error;
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await prisma.usuario.findUnique({
        where: { id_usuario: userId },
        select: { password: true }
      });

      if (!user) throw new ConflictError('Usuario no encontrado');

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) throw new ConflictError('La contraseña actual es incorrecta');

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.usuario.update({
        where: { id_usuario: userId },
        data: { password: hashed }
      });

      logger.info(`Contraseña actualizada para usuario ${userId}`);
    } catch (error) {
      logger.error('Error al cambiar contraseña:', error);
      throw error;
    }
  }


}

export const userService = new UserService();
