import { logger } from "@/config/logger";
import { ModuleInterface, RolInterface } from "@/interface/modulePermissionInterface";
import { cacheService } from "./cache.service";
import { prisma } from "@/config/database";
import { ConflictError } from "@/utils/appError";

const KEY_CATALOG = 'roles';
export class RolPermissionService {
    async getModulePermission(): Promise<ModuleInterface[]> {
        try {
            const cacheKey = `${KEY_CATALOG}:permission`;
            const cached = cacheService.get<ModuleInterface[]>(cacheKey);

            if (cached) {
                return cached;
            }
            const modules = await prisma.modulo.findMany({
                where: { estado_registro: true },
                include: {
                    permisos: {
                        where: { estado_registro: true }
                    }
                }
            });

            const response: ModuleInterface[] = modules.map(module => ({
                id_module: module.id_modulo,
                name: module.nombre,
                permissions: module.permisos.map(permission => ({
                    id_permission: permission.id_permiso,
                    id_module: permission.id_modulo,
                    name: permission.accion,
                    code: permission.codigo,
                    descripcion: permission.descripcion
                }))
            }));
            cacheService.set(cacheKey, response);
            return response;
        } catch (error) {
            logger.error("Error al obtener los modulos y permisos", error);
            throw error;
        }
    }

    async createRol(data: RolInterface): Promise<RolInterface> {
        try {
            const cacheKey = `${KEY_CATALOG}:all`;
            const rol = await prisma.rol.create({
                data: {
                    nombre: data.name,
                    permisos: {
                        create: data.permissions.map((permisoId) => ({
                            permiso: {
                                connect: { id_permiso: permisoId }
                            }
                        }))
                    }
                },
                include: {
                    permisos: {
                        include: { permiso: true }
                    }
                }
            });
            const response: RolInterface = {
                id_rol: rol.id_rol,
                name: rol.nombre,
                permissions: rol.permisos.map(rp => rp.id_permiso),
                fecha_registro: rol.fecha_registro
            }
            cacheService.delete(cacheKey);
            return response;
        } catch (error) {
            logger.error("Error al crear el rol", error);
            throw error;
        }
    }

    async updateRol(data: RolInterface): Promise<RolInterface> {
        try {
            const cacheKey = `${KEY_CATALOG}:all`;
            if (data.permissions.length <= 0) {
                throw new ConflictError("No se puede crear un rol sin permisos");
            }

            // Verificar que el rol existe y está activo
            const existRol = await prisma.rol.findUnique({
                where: { id_rol: data.id_rol!, estado_registro: true }
            });
            if (!existRol || !existRol.estado_registro) {
                throw new ConflictError("No se encontró el rol");
            }


            const rolActualizado = await prisma.$transaction(async (tx) => {

                //Actualizar el nombre del rol
                const rol = await tx.rol.update({
                    where: { id_rol: data.id_rol! },
                    data: { nombre: data.name },
                    include: {
                        permisos: true // obtenemos los permisos actuales
                    }
                });

                //Borrar los permisos actuales del rol
                await tx.rolPermiso.deleteMany({
                    where: { id_rol: data.id_rol! }
                });

                //Insertar los nuevos permisos (solo si hay alguno)
                if (data.permissions && data.permissions.length > 0) {
                    await tx.rolPermiso.createMany({
                        data: data.permissions.map((permisoId) => ({
                            id_rol: data.id_rol!,
                            id_permiso: permisoId
                        })),
                        skipDuplicates: true
                    });
                }

                return rol;
            });
            //Retornar respuesta
            const response: RolInterface = {
                id_rol: rolActualizado.id_rol,
                name: rolActualizado.nombre,
                permissions: data.permissions,
                fecha_registro: rolActualizado.fecha_registro

            };
            cacheService.delete(cacheKey);
            return response;

        } catch (error) {
            logger.error("Error al editar el rol", error);
            throw error;
        }
    }

    async getAllRoles(): Promise<RolInterface[]> {
        try {
            const cacheKey = `${KEY_CATALOG}:all`;
            const cached = cacheService.get<RolInterface[]>(cacheKey);
            if (cached) {
                console.log('Desde la cache')
                return cached
            }

            const roles = await prisma.rol.findMany({
                where: { estado_registro: true },
                include: {
                    permisos: true
                },
                orderBy: {id_rol: 'desc'}
            });
            const response: RolInterface[] = roles.map(rol => ({
                id_rol: rol.id_rol,
                name: rol.nombre,
                fecha_registro: rol.fecha_registro,
                permissions: rol.permisos.map(per => per.id_permiso),
                cantidad_permisos: rol.permisos.length,
            }));
            cacheService.set<RolInterface[]>(cacheKey, response);
            return response;
        } catch (error) {
            logger.error("Error al obtener los roles", error);
            throw error;
        }
    }

    async deleteRol(id_rol: number): Promise<void> {
        try {
            const cacheKey = `${KEY_CATALOG}:all`;
            const existRol = await prisma.rol.findUnique({
                where: { id_rol, estado_registro: true }
            });
            if (!existRol) {
                throw new ConflictError("El rol no existe");
            }


            await prisma.rol.update({
                where: { id_rol },
                data: { estado_registro: false },
            });
            cacheService.delete(cacheKey);
        } catch (error) {
            logger.error("Erroral eliminar el rol", error);
            throw error;
        }
    }

}

export const rolPermissionService = new RolPermissionService();