import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { CentroNutremeInterface, UpdateCentroNutremeInterface } from "@/interface/centroNutremeInterface";
import { ConflictError } from "@/utils/appError";
import { qrService } from "./qr.service";
import { CAMPO_CENTRO, CENTRO_NUTREME_UUID } from "@/constants/form-regions.constants";
import { cacheService } from "./cache.service";

class CentroNutremeService {
    async createCentroNutreme(data: CentroNutremeInterface): Promise<any> {
        try {
            const existeCodigo = await prisma.centroNutreme.findUnique({
                where: { codigo: data.codigo }
            });

            if (existeCodigo) {
                throw new ConflictError('El código ingresado ya existe');
            }

            const centro = await prisma.centroNutreme.create({
                data: {
                    codigo: data.codigo,
                    nombre: data.nombre,
                    id_comunidad: data.id_comunidad,
                    id_usuario: data.id_usuario || null,
                    // coordenadas: data.coordenadas || null,
                },
                include: {
                    comunidad: { select: { id_comunidad: true, nombre: true, id_departamento: true } },
                    usuario: { select: { id_usuario: true, nombres: true, apellidos: true } },
                }
            });

            // Generar QR automáticamente
            const { qr_path } = await qrService.generarQrCentroNutreme(
                centro.id_centro_nutreme,
                centro.uuid,
                centro.nombre
            );

            const centroConQr = await prisma.centroNutreme.update({
                where: { id_centro_nutreme: centro.id_centro_nutreme },
                data: { qr_path },
                include: {
                    comunidad: { select: { id_comunidad: true, nombre: true, id_departamento: true } },
                    usuario: { select: { id_usuario: true, nombres: true, apellidos: true } },
                }
            });

            cacheService.delete('catalogs:item:items:88');
            logger.info(`✅ Centro Nútreme creado: ${centro.codigo}`);
            return centroConQr;
        } catch (error) {
            logger.error('Error en el registro de centro nutreme', error);
            throw error;
        }
    }

    async updateCentroNutreme(id_centro_nutreme: number, data: UpdateCentroNutremeInterface) {
        try {
            const existente = await prisma.centroNutreme.findUnique({
                where: { id_centro_nutreme }
            });

            if (!existente) throw new ConflictError('Centro Nútreme no encontrado');

            // Verificar código único si cambió
            if (data.codigo && data.codigo !== existente.codigo) {
                const existeCodigo = await prisma.centroNutreme.findUnique({
                    where: { codigo: data.codigo }
                });
                if (existeCodigo) throw new ConflictError('El código ingresado ya existe');
            }
            cacheService.delete('catalogs:item:items:88');

            return prisma.centroNutreme.update({
                where: { id_centro_nutreme },
                data: {
                    ...(data.codigo ? { codigo: data.codigo } : {}),
                    ...(data.nombre ? { nombre: data.nombre } : {}),
                    ...(data.id_comunidad ? { id_comunidad: data.id_comunidad } : {}),
                    ...(data.id_usuario !== undefined ? { id_usuario: data.id_usuario } : {}),
                    ...(data.coordenadas !== undefined ? { coordenadas: data.coordenadas } : {}),
                },
                include: {
                    comunidad: { select: { id_comunidad: true, nombre: true, id_departamento: true } },
                    usuario: { select: { id_usuario: true, nombres: true, apellidos: true } },
                }
            });

        } catch (error) {
            logger.error('Error actualizando centro nútreme', error);
            throw error;
        }
    }
    async deleteCentroNutreme(id_centro_nutreme: number) {
        try {
            const existente = await prisma.centroNutreme.findUnique({
                where: { id_centro_nutreme }
            });
            if (!existente) throw new ConflictError('Centro Nútreme no encontrado');

            await prisma.centroNutreme.update({
                where: { id_centro_nutreme },
                data: { estado_registro: false }
            });
            cacheService.delete('catalogs:item:items:88');
            logger.info(`✅ Centro Nútreme eliminado: ${id_centro_nutreme}`);
        } catch (error) {
            logger.error('Error eliminando centro nútreme', error);
            throw error;
        }
    }

    async getCentros(filters: {
        id_comunidad?: number;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { estado_registro: true };
        if (filters.id_comunidad) where.id_comunidad = filters.id_comunidad;

        const [total, centros] = await Promise.all([
            prisma.centroNutreme.count({ where }),
            prisma.centroNutreme.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fecha_registro: 'desc' },
                include: {
                    comunidad: { select: { id_comunidad: true, nombre: true, id_departamento: true } },
                    usuario: { select: { id_usuario: true, nombres: true, apellidos: true } },
                }
            })
        ]);

        return {
            data: centros,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    async getCentroById(id_centro_nutreme: number) {
        const centro = await prisma.centroNutreme.findUnique({
            where: { id_centro_nutreme },
            include: {
                comunidad: { select: { id_comunidad: true, nombre: true, id_departamento: true } },
                usuario: { select: { id_usuario: true, nombres: true, apellidos: true } },
            }
        });
        if (!centro) throw new ConflictError('Centro Nútreme no encontrado');
        return centro;
    }

    async generarQr(id_centro_nutreme: number) {
        const centro = await prisma.centroNutreme.findUnique({
            where: { id_centro_nutreme }
        });
        if (!centro) throw new ConflictError('Centro Nútreme no encontrado');

        if (centro.qr_path) return { qr_path: centro.qr_path };

        const { qr_path } = await qrService.generarQrCentroNutreme(
            centro.id_centro_nutreme,
            centro.uuid,
            centro.nombre
        );

        await prisma.centroNutreme.update({
            where: { id_centro_nutreme },
            data: { qr_path }
        });

        return { qr_path };
    }

    async getEvaluaciones(filters: {
        page?: number;
        limit?: number;
        fecha_desde?: string;
        fecha_hasta?: string;
    }): Promise<any> {
        try {
            // const CENTRO_NUTREME_UUID = '3fddc6b4-bc83-4b54-bcdd-7eca0176d1bf';
            // const CAMPO_CENTRO = 'element_1782922523349_0';

            const formulario = await prisma.formulario.findFirst({
                where: { uuid: CENTRO_NUTREME_UUID, estado_registro: true }
            });
            if (!formulario) throw new ConflictError('Formulario no encontrado');

            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const skip = (page - 1) * limit;

            const where: any = {
                id_formulario: formulario.id_formulario,
                estado_registro: true,
            };

            if (filters.fecha_desde || filters.fecha_hasta) {
                where.fecha_registro = {};
                if (filters.fecha_desde) where.fecha_registro.gte = new Date(filters.fecha_desde);
                if (filters.fecha_hasta) where.fecha_registro.lte = new Date(filters.fecha_hasta);
            }

            const [total, respuestas] = await Promise.all([
                prisma.formularioRespuesta.count({ where }),
                prisma.formularioRespuesta.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { fecha_registro: 'desc' },
                    select: {
                        id_respuesta: true,
                        fecha_registro: true,
                        datos_limpios: true,
                        usuario: {
                            select: {
                                id_usuario: true,
                                nombres: true,
                                apellidos: true,
                            }
                        }
                    }
                })
            ]);

            // Obtener ids únicos de centros
            const idsCentros = [
                ...new Set(
                    respuestas
                        .map(r => (r.datos_limpios as any)?.[CAMPO_CENTRO])
                        .filter(Boolean)
                        .map(Number)
                )
            ];

            // Un solo query para todos los centros
            const centros = await prisma.centroNutreme.findMany({
                where: { id_centro_nutreme: { in: idsCentros } },
                include: {
                    comunidad: { select: { nombre: true } },
                    usuario: { select: { nombres: true, apellidos: true } },
                }
            });

            const centroMap = new Map(
                centros.map(c => [c.id_centro_nutreme, c])
            );

            const data = respuestas.map(r => {
                const datos = r.datos_limpios as any ?? {};
                const idCentro = Number(datos[CAMPO_CENTRO]);
                const centro = centroMap.get(idCentro);

                return {
                    id_respuesta: r.id_respuesta,
                    fecha_registro: r.fecha_registro,
                    evaluador: r.usuario
                        ? `${r.usuario.nombres} ${r.usuario.apellidos}`
                        : '—',
                    centro: centro ? {
                        id_centro_nutreme: centro.id_centro_nutreme,
                        nombre: centro.nombre,
                        comunidad: centro.comunidad?.nombre ?? '—',
                        personal_a_cargo: centro.usuario
                            ? `${centro.usuario.nombres} ${centro.usuario.apellidos}`
                            : '—',
                    } : null,
                };
            });

            return {
                data,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
            };
        } catch (error) {
            logger.error('Error al obtener evaluaciones de centro nútreme', error);
            throw error;
        }
    }
}

export const centroNutremeService = new CentroNutremeService();