// import { prisma } from '@/config/database';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { UserPayloadInterface } from '@/interface/authInterface';
import { UserProfileInterface } from '@/interface/userInterface';
import { ConflictError } from '@/utils/appError';
// import { ConflictError, NotFoundError, UnauthorizedError } from '@/utils/appError';
// import bcrypt from 'bcryptjs';

// const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS!);


class UserService {
  // async getUserProfile(userId: number): Promise<UserProfileInterface> {
  //   try {
  //     // const user = await prisma.user.findUnique({
  //     //   where: { idUser: userId },
  //     //   select: {
  //     //     idUser: true,
  //     //     email: true,
  //     //     firstName: true,
  //     //     lastName: true,
  //     //     role: true,
  //     //     isActive: true,
  //     //     createdAt: true,
  //     //     updatedAt: true,
  //     //     lastLogin: true,
  //     //   },
  //     // });

  //     // if (!user) {
  //     //   throw new NotFoundError('Usuario no encontrado');
  //     // }

  //     // return this.setUser(user);
  //     return {} as UserProfileInterface;
  //   } catch (error) {
  //     logger.error('Error al editar el usuario: ', error);
  //     throw error;
  //   }
  // }

  async updateUserProfile(
    userId: number,
    updateData: UserPayloadInterface
  ): Promise<any> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        if(userId == 1){
          throw new ConflictError("No tiene permisos para modificar este usuario");
        }

        const existingUser = await tx.usuario.findFirst({
          where: { email: updateData.email, estado_registro: true, id_usuario: { not: userId } }
        });

        if (existingUser) {
          throw new ConflictError('El correo ingresado ya existe');
        }

        const accessGlobal =
          !updateData.comunidades?.length &&
          !updateData.deparaments?.length;

        const updatePayload: any = {
          nombres: updateData.firstName,
          apellidos: updateData.lastName,
          email: updateData.email,
          id_rol: Number(updateData.rol),
          accesso_global: accessGlobal
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
        estado_registro: result.estado_registro
      }
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

  // async getUserByEmail(email: string): Promise<UserProfileInterface | null> {
  //   try {
  //     // const user = await prisma.user.findUnique({
  //     //   where: { email },
  //     //   select: {
  //     //     idUser: true,
  //     //     email: true,
  //     //     firstName: true,
  //     //     lastName: true,
  //     //     role: true,
  //     //     isActive: true,
  //     //     createdAt: true,
  //     //     updatedAt: true,
  //     //     lastLogin: true,
  //     //   },
  //     // });

  //     // return this.setUser(user);
  //     return null
  //   } catch (error) {
  //     logger.error('Error al obtener el usuario por email:', error);
  //     throw error;
  //   }
  // }

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

      logger.info(`User deleted: ${user.email}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // async changePassword(idUser: number, oldPassword: string, newPassword: string) {
  //   try {
  //   //   const user = await prisma.user.findUnique({
  //   //     where: { idUser: idUser }
  //   //   });
  //   //   if (!user) {
  //   //     throw new NotFoundError("Usuario no encontrado");
  //   //   }

  //   //   if (!user.isActive) {
  //   //     throw new NotFoundError("La cuenta está desactivada");
  //   //   }


  //   //   const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  //   //   if (!isPasswordValid) {
  //   //     throw new UnauthorizedError('La contraseña actual no coincide con la contraseña guardada');
  //   //   }

  //   //   const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  //   //   await prisma.user.update({
  //   //     where: { idUser: idUser },
  //   //     data: { password: hashedPassword }
  //   //   });
  //   //   logger.info("Contraseña actualizada");
  //   } catch (error) {
  //     logger.error("Error al actualizar la contraseña: ", error);
  //     throw error;
  //   }
  // }

  // setUser = (user: any): UserProfileInterface => {
  //   const dataUser: UserProfileInterface = {
  //     email: user.email,
  //     firstName: user.firstName,
  //     lastName: user.lastName,
  //     idUser: user.idUser,
  //     isActive: user.isActive,
  //     role: user.role,
  //   };
  //   return dataUser;
  // };
}

export const userService = new UserService();
