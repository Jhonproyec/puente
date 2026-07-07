import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { CARNET_FORM_UUID, FAMILIA_FORM_UUID } from "@/constants/form-regions.constants";

export class SyncService {
    async getInitialSyncData(userId: number) {
        try {
            logger.info(`[SYNC] Iniciando sync para usuario ${userId}`);

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

            const comunidadesFilter = hasAssignedComunidades
                ? { id_comunidad: { in: userComunidadeIds } }
                : {};

            const [
                formularios,
                catalogs,
                departamentos,
                comunidades,
                centrosAtencion,
                rangosHito,
                personas,
                familias,
                centrosNutreme,
                usuarios,
                carnetRespuestas,
            ] = await Promise.all([

                // Formularios
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

                // Catálogos
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

                // Departamentos
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

                // Comunidades
                prisma.comunidad.findMany({
                    where: {
                        estado_registro: true,
                        ...comunidadesFilter,
                    },
                    select: {
                        id_comunidad: true,
                        id_departamento: true,
                        nombre: true,
                    }
                }),

                // Centros de atención
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

                // Rangos hito
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

                // Personas
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
                        codigo_temporal: true,
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
                        registro_incompleto: true,
                        qr_path: true,
                    }
                }),

                // Familias con integrantes y última respuesta del formulario de familias
                prisma.familia.findMany({
                    where: {
                        estado_registro: true,
                        ...(hasAssignedComunidades ? {
                            id_comunidad: { in: userComunidadeIds }
                        } : {})
                    },
                    select: {
                        id_familia: true,
                        codigo: true,
                        id_madre: true,
                        id_comunidad: true,
                        qr_path: true,
                        fecha_registro: true,
                        integrantes: {
                            where: { estado_registro: true },
                            select: {
                                id_persona: true,
                                rol: true,
                            }
                        },
                        // Solo respuestas del formulario de registro de familias
                        respuestas: {
                            where: {
                                estado_registro: true,
                                formulario: { uuid: FAMILIA_FORM_UUID },
                            },
                            orderBy: { fecha_registro: 'desc' },
                            take: 1,
                            select: {
                                id_respuesta: true,
                                datos_limpios: true,
                                version_form: true,
                            }
                        }
                    }
                }),

                prisma.centroNutreme.findMany({
                    where: {estado_registro: true},
                    select:{
                        id_centro_nutreme: true, 
                        uuid: true, 
                        codigo: true, 
                        nombre: true, 
                        id_comunidad: true, 
                        latitud: true, 
                        longitud: true,
                    },
                    orderBy: {nombre: 'asc'}
                }),

                prisma.usuario.findMany({
                    where: {estado_registro: true},
                    select: {
                        id_usuario: true, 
                        nombres: true, 
                        apellidos: true, 
                        dpi: true,
                    },
                    orderBy: {nombres: 'asc'}
                }),

                prisma.formularioRespuesta.findMany({
                    where: {
                        estado_registro: true, 
                        formulario: {uuid: CARNET_FORM_UUID},
                        ...(hasAssignedComunidades ? {id_comunidad: {in: userComunidadeIds}} : {})
                    },
                    select: {
                        id_respuesta: true, 
                        datos_limpios: true, 
                        version_form: true, 
                        id_comunidad: true, 
                        personas: {
                            select: {id_persona: true}
                        },
                        carnetBimestres: {
                            where: {estado_registro: true},
                            select: {mes:  true, bimestre: true, huellas: true}
                        }
                    }
                })
            ]);

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
                familias: familias.map(f => ({
                    id_familia: f.id_familia,
                    codigo: f.codigo,
                    id_madre: f.id_madre,
                    id_comunidad: f.id_comunidad,
                    qr_path: f.qr_path,
                    fecha_registro: f.fecha_registro,
                    id_respuesta: f.respuestas[0]?.id_respuesta || null,
                    datos_limpios: f.respuestas[0]?.datos_limpios || null,
                    integrantes: f.integrantes,
                })),
                centrosNutreme,
                usuarios,
                carnetRespuestas: carnetRespuestas.map(r => ({
                    id_respuesta: r.id_respuesta,
                    datos_limpios: r.datos_limpios,
                    version_form: r.version_form,
                    id_persona: r.personas[0]?.id_persona || null,
                    id_comunidad: r.id_comunidad,
                    bimestres: r.carnetBimestres
                })),
            };

        } catch (error) {
            logger.error('[SYNC] Error en sync inicial', error);
            throw error;
        }
    }
}

export const syncService = new SyncService();