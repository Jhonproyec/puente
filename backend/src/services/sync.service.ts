import { prisma } from "@/config/database";
import { logger } from "@/config/logger";

export class SyncService {
    async getInitialSyncData(userId: number) {
        try {
            logger.info(`[SYNC] Iniciando sync para usuario ${userId}`);

            //Primero obtener el usuario y sus comunidades asignadas
            const user = await prisma.usuario.findUnique({
                where: { id_usuario: userId },
                select: {
                    accesso_global: true,
                    comunidades: {
                        select: { id_comunidad: true }
                    }
                }
            });

            if (!user) throw new Error(`Usuario ${userId} no encontrado`);

            const userComunidadeIds = user.comunidades.map(c => c.id_comunidad);
            const hasAssignedComunidades = userComunidadeIds.length > 0;

            logger.info(
                `[SYNC] Usuario ${userId} tiene ${hasAssignedComunidades
                    ? `${userComunidadeIds.length} comunidades asignadas`
                    : 'acceso global'
                }`
            );

            const [
                formularios,
                catalogs,
                departamentos,
                comunidades,
                centrosAtencion,
                rangosHito,
                personas,
            ] = await Promise.all([
                prisma.formulario.findMany({
                    where: {
                        estado_registro: true,
                        estado: 'PUBLICADO',
                        usuariosAsignados: {
                            some: { id_usuario: userId }
                        }
                    },
                    select: {
                        uuid: true,
                        nombre: true,
                        version: true,
                        estado: true,
                        estructura: true,
                        fecha_registro: true,
                        fecha_edicion: true,
                    }
                }),

                prisma.catalog.findMany({
                    where: { estado_registro: true },
                    include: {
                        items: {
                            where: { estado_registro: true },
                            select: {
                                id_catalog_item: true,
                                id_catalog: true,
                                nombre: true,
                            }
                        }
                    }
                }),

                //Solo departamentos con comunidades del usuario
                prisma.departamento.findMany({
                    where: {
                        estado_registro: true,
                        ...(hasAssignedComunidades ? {
                            items: {
                                some: {
                                    id_comunidad: { in: userComunidadeIds },
                                    estado_registro: true,
                                }
                            }
                        } : {})
                    },
                    select: {
                        id_departamento: true,
                        nombre: true,
                    }
                }),

                //Solo comunidades asignadas o todas
                prisma.comunidad.findMany({
                    where: {
                        estado_registro: true,
                        ...(hasAssignedComunidades ? {
                            id_comunidad: { in: userComunidadeIds }
                        } : {})
                    },
                    select: {
                        id_comunidad: true,
                        id_departamento: true,
                        nombre: true,
                    }
                }),

                //Solo centros de las comunidades asignadas
                prisma.centroAtencion.findMany({
                    where: {
                        estado_registro: true,
                        ...(hasAssignedComunidades ? {
                            id_comunidad: { in: userComunidadeIds }
                        } : {})
                    },
                    select: {
                        id_centro: true,
                        id_comunidad: true,
                        nombre: true,
                    }
                }),

                prisma.rangoHito.findMany({
                    where: { estado_registro: true },
                    include: {
                        items: {
                            where: { estado_registro: true },
                            select: {
                                id_rango_hito_detalle: true,
                                id_rango_hito: true,
                                nombre: true,
                            }
                        }
                    }
                }),

                //Solo personas de las comunidades asignadas
                prisma.persona.findMany({
                    where: {
                        estado_registro: true,
                        ...(hasAssignedComunidades ? {
                            id_comunidad: { in: userComunidadeIds }
                        } : {})
                    },
                    select: {
                        id_persona: true,
                        cui: true,
                        nombres: true,
                        apellidos: true,
                        fecha_nacimiento: true,
                        sexo: true,
                        direccion: true,
                        fecha_ingreso_programa: true,
                        cui_madre: true,
                        tipo_persona: true,
                        id_comunidad: true,
                        datos_extra: true,
                    }
                }),
            ]);

            logger.info(
                `[SYNC] Datos listos: ${formularios.length} formularios, ` +
                `${comunidades.length} comunidades, ${personas.length} personas`
            );

            return {
                user,
                formularios,
                catalogs: catalogs.map(c => ({
                    id_catalogo: c.id_catalogo,
                    nombre: c.nombre,
                    tiene_cascada: c.tiene_cascada,
                    campo_filtro: c.campo_filtro,
                    tabla_origen: c.tabla_origen,
                    items: c.items,
                })),
                departamentos,
                comunidades,
                centrosAtencion,
                rangosHito: rangosHito.map(r => ({
                    id_rango_hito: r.id_rango_hito,
                    nombre: r.nombre,
                    items: r.items,
                })),
                personas,
            };

        } catch (error) {
            logger.error('[SYNC] Error en sync inicial', error);
            throw error;
        }
    }
}

export const syncService = new SyncService();