import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { SaveResponseInput } from "@/interface/formResponseInterface";
import { ConflictError } from "@/utils/appError";
import { cacheService } from "./cache.service";
import { familiaService } from "./familia.service";
import { CARNET_FORM_UUID, FAMILIA_FORM_UUID } from "@/constants/form-regions.constants";
import { carnetService } from "./carnet.service";
import { imageService } from "./imagesForms.service";
// import { REGION_MADRE } from "@/constants/form-regions.constants";

const KEY_CATALOG = 'forms'

export class FormResponseService {

    async saveResponse(input: SaveResponseInput) {
        const { id_usuario, responses, visibleElements } = input;
        const cacheKey = `${KEY_CATALOG}:info:${input.id_formulario}`;

        const formulario = await prisma.formulario.findFirst({
            where: {
                OR: [
                    { uuid: String(input.id_formulario) },
                    { id_formulario: Number(input.id_formulario) || 0 }
                ],
                estado_registro: true
            }
        });

        if (!formulario) throw new ConflictError('Formulario no encontrado');

        const id_formulario = formulario.id_formulario;

        const estructura = input.estructura || (formulario.estructura as any);

        const { id_comunidad, id_departamento } = await this.extractLocationIds(
            estructura, responses, visibleElements
        );

        // ✅ Limpiar primero
        const datos_limpios_raw = this.cleanResponses(responses, visibleElements);

        const resultado = await prisma.$transaction(async (tx) => {

            // ✅ Crear con datos_limpios_raw temporalmente para obtener id_respuesta
            const respuesta = await tx.formularioRespuesta.create({
                data: {
                    id_formulario,
                    id_usuario: id_usuario || null,
                    version_form: formulario.version,
                    datos: responses,
                    datos_limpios: datos_limpios_raw,
                    id_comunidad: id_comunidad || null,
                    id_departamento: id_departamento || null,
                }
            });

            // ✅ Procesar imágenes ahora que tenemos id_respuesta
            const datos_limpios = await imageService.processImages(
                datos_limpios_raw,
                respuesta.id_respuesta
            );

            // ✅ Actualizar ambos campos — datos y datos_limpios sin base64
            await tx.formularioRespuesta.update({
                where: { id_respuesta: respuesta.id_respuesta },
                data: {
                    datos_limpios,
                    // ✅ También limpiar base64 del campo datos
                    datos: datos_limpios
                }
            });

            const uuid = String(input.id_formulario);

            if (uuid === FAMILIA_FORM_UUID) {
                const id_familia = await familiaService.procesarFamilia(
                    tx, estructura, responses, visibleElements,
                    id_comunidad, respuesta.id_respuesta
                );
                if (id_familia) {
                    await tx.formularioRespuesta.update({
                        where: { id_respuesta: respuesta.id_respuesta },
                        data: { id_familia }
                    });
                }
            } else if (uuid === CARNET_FORM_UUID) {
                await carnetService.procesarCarnet(
                    tx, estructura, responses,
                    id_comunidad,
                    respuesta.id_respuesta
                );
            }

            return respuesta;
        }, { timeout: 100000 });

        cacheService.delete(cacheKey);
        logger.info(`Respuesta guardada: ${resultado.id_respuesta}`);
        return resultado;
    }

    async getPersonaByCui(cui: string): Promise<any> {
        try {
            const persona = await prisma.persona.findUnique({
                where: { cui },
                include: {
                    comunidad: {
                        select: {
                            id_comunidad: true,
                            nombre: true,
                            id_departamento: true
                        }
                    }
                }
            });

            if (!persona) throw new ConflictError('Persona no encontrada');

            return persona;
        } catch (error) {
            logger.error('Error al buscar persona por CUI', error);
            throw error;
        }
    }

    // =============================================
    // HELPERS
    // =============================================

    /**
     * Limpia las respuestas dejando solo campos visibles con valor
     */
    private cleanResponses(
        responses: Record<string, any>,
        visibleElements: string[]
    ): Record<string, any> {
        const limpios: Record<string, any> = {};

        // ✅ Filtrado normal por visibleElements
        for (const [key, value] of Object.entries(responses)) {
            if (visibleElements.includes(key)) {
                console.log(`✅ incluido: ${key} =`, value); 
                limpios[key] = value;
            }else{
                console.log(`❌ excluido: ${key}`); 
            }
        }

        // ✅ Conservar los __catalog__ cuyo survey base quedó visible
        for (const [key, value] of Object.entries(responses)) {
            if (key.startsWith('__catalog__')) {
                const surveyBaseId = key.replace('__catalog__', '');
                if (limpios[surveyBaseId] !== undefined) {
                    // 👇 usar el valor del survey base (ya actualizado) en lugar del __catalog__ viejo
                    const surveyBase = limpios[surveyBaseId];
                    if (typeof surveyBase === 'object' && 'selectedIds' in surveyBase) {
                        limpios[key] = surveyBase; // ✅ mismo objeto que el survey base
                    } else {
                        limpios[key] = value; // fallback al valor original
                    }
                }
            }
        }

        return limpios;
    }

    /**
     * Extrae el id_comunidad e id_departamento de las respuestas
     * buscando elementos con catalogType de comunidad o departamento
     */
    private async extractLocationIds(
        estructura: SaveResponseInput['estructura'],
        responses: Record<string, any>,
        visibleElements: string[]
    ): Promise<{ id_comunidad: number | null, id_departamento: number | null }> {
        let id_comunidad: number | null = null;
        let id_departamento: number | null = null;

        for (const region of estructura!.regions) {
            const elements = (region as any).children ?? (region as any).elements ?? [];

            for (const element of elements) {
                if (!visibleElements.includes(element.id)) continue;

                const valor = responses[element.id];
                if (!valor) continue;

                const catalogType = (element as any).catalogType;
                if (!catalogType) continue;

                const catalog = await prisma.catalog.findUnique({
                    where: { id_catalogo: Number(catalogType) }
                });

                if (catalog?.tabla_origen === 'comunidad') {
                    id_comunidad = Number(valor);
                    const comunidad = await prisma.comunidad.findUnique({
                        where: { id_comunidad: id_comunidad }
                    });
                    id_departamento = comunidad?.id_departamento || null;
                }

                if (catalog?.tabla_origen === 'departamento') {
                    id_departamento = Number(valor);
                }
            }
        }

        return { id_comunidad, id_departamento };
    }

    /**
     * Obtener respuestas de un formulario con filtros
     */
    async getResponses(id_formulario: number, filters: {
        id_comunidad?: number;
        id_departamento?: number;
        fecha_desde?: string;
        fecha_hasta?: string;
        id_usuario?: number;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {
            id_formulario,
            estado_registro: true
        };

        if (filters.id_comunidad) where.id_comunidad = filters.id_comunidad;
        if (filters.id_departamento) where.id_departamento = filters.id_departamento;
        if (filters.id_usuario) where.id_usuario = filters.id_usuario;
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
                include: {
                    usuario: {
                        select: { id_usuario: true, nombres: true, apellidos: true }
                    },
                    comunidad: {
                        select: { id_comunidad: true, nombre: true }
                    },
                    departamento: {
                        select: { id_departamento: true, nombre: true }
                    },
                    personas: {
                        include: {
                            persona: {
                                select: {
                                    id_persona: true, cui: true,
                                    nombres: true, apellidos: true, tipo_persona: true
                                }
                            }
                        }
                    }
                }
            })
        ]);

        return {
            data: respuestas,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getFormResponses(uuid: string, filters: {
        id_comunidad?: number;
        id_departamento?: number;
        fecha_desde?: string;
        fecha_hasta?: string;
        page?: number;
        limit?: number;
    }): Promise<any> {
        try {
            // Obtener id_formulario desde uuid
            const formulario = await prisma.formulario.findFirst({
                where: { uuid, estado_registro: true }
            });
            if (!formulario) throw new ConflictError('Formulario no encontrado');

            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const skip = (page - 1) * limit;

            const where: any = {
                id_formulario: formulario.id_formulario,
                estado_registro: true
            };

            if (filters.id_comunidad) where.id_comunidad = filters.id_comunidad;
            if (filters.id_departamento) where.id_departamento = filters.id_departamento;
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
                    include: {
                        usuario: {
                            select: { id_usuario: true, nombres: true, apellidos: true }
                        },
                        comunidad: { select: { id_comunidad: true, nombre: true } },
                        departamento: { select: { id_departamento: true, nombre: true } },
                        personas: {
                            include: {
                                persona: {
                                    select: {
                                        id_persona: true, cui: true,
                                        nombres: true, apellidos: true, tipo_persona: true
                                    }
                                }
                            }
                        }
                    }
                })
            ]);

            return {
                data: respuestas,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
            };
        } catch (error) {
            logger.error('Error al obtener respuestas del formulario', error);
            throw error;
        }
    }

    async deleteResponse(id_respuesta: number): Promise<void> {
        try {
            const existing = await prisma.formularioRespuesta.findUnique({
                where: { id_respuesta },
                include: {
                    formulario: {
                        select: { uuid: true }
                    }
                }
            });
            if (!existing) throw new ConflictError('Respuesta no encontrada');

            await prisma.formularioRespuesta.update({
                where: { id_respuesta },
                data: { estado_registro: false }
            });

            cacheService.delete(`${KEY_CATALOG}:info:${existing.formulario.uuid}`);

        } catch (error) {
            logger.error('Error al eliminar respuesta', error);
            throw error;
        }
    }

    async updateResponse(
        id_respuesta: number,
        datos: Record<string, any>
    ): Promise<any> {
        try {
            const existing = await prisma.formularioRespuesta.findUnique({
                where: { id_respuesta },
                include: {
                    formulario: {
                        select: { uuid: true, version: true, estructura: true }
                    }
                }
            });

            if (!existing) throw new ConflictError('Respuesta no encontrada');

            const estructura = existing.formulario.estructura as any;
            const visibleElements = (datos as any).visibleElements as string[] || [];
            const responses = datos;

            const { id_comunidad, id_departamento } = await this.extractLocationIds(
                estructura,
                responses,
                visibleElements
            );

            //Limpiar y procesar imágenes
            const datos_limpios_raw = this.cleanResponses(responses, visibleElements);
            const datos_limpios = await imageService.processImages(
                datos_limpios_raw,
                id_respuesta
            );



            const updated = await prisma.$transaction(async (tx) => {

                // Actualizar respuesta principal
                const respuesta = await tx.formularioRespuesta.update({
                    where: { id_respuesta },
                    data: {
                        datos: datos_limpios,
                        datos_limpios,
                        id_comunidad: id_comunidad || null,
                        id_departamento: id_departamento || null,
                        fecha_edicion: new Date()
                    }
                });

                const uuid = existing.formulario.uuid;

                if (uuid === FAMILIA_FORM_UUID) {
                    const id_familia = await familiaService.procesarFamilia(
                        tx,
                        estructura,
                        responses,
                        visibleElements,
                        id_comunidad,
                        id_respuesta
                    );

                    if (id_familia) {
                        await tx.formularioRespuesta.update({
                            where: { id_respuesta },
                            data: { id_familia }
                        });
                    }

                } else if (uuid === CARNET_FORM_UUID) {
                    await carnetService.procesarCarnet(
                        tx,
                        estructura,
                        responses,
                        id_comunidad,
                        id_respuesta
                    );
                }

                return respuesta;
            });

            return updated;
        } catch (error) {
            logger.error('Error al editar respuesta', error);
            throw error;
        }
    }

    async getResponseById(id_respuesta: number): Promise<any> {
        try {
            const respuesta = await prisma.formularioRespuesta.findUnique({
                where: { id_respuesta },
                select: {
                    id_respuesta: true,
                    datos_limpios: true,
                }
            });

            if (!respuesta) throw new ConflictError('Respuesta no encontrada');

            return respuesta;
        } catch (error) {
            logger.error('Error al obtener respuesta por ID', error);
            throw error;
        }
    }


    async getEvaluacionesDocentes(filters: {
        page?: number;
        limit?: number;
        fecha_desde?: string;
        fecha_hasta?: string;
    }): Promise<any> {
        try {
            const DOCENTES_UUID = 'd887da57-6fd0-447a-b533-4e0224f989cd';
            const CAMPO_EDUCADOR = 'element_1772821448441_2';
            const CAMPO_ESPECIALIDAD = 'element_1772821469327_3';
            const CAMPO_REALIZO_SESION = 'element_1772821566720_4';

            const formulario = await prisma.formulario.findFirst({
                where: { uuid: DOCENTES_UUID, estado_registro: true }
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

            // IDs únicos de educadores y especialidades
            const idsEducadores = [
                ...new Set(
                    respuestas
                        .map(r => (r.datos_limpios as any)?.[CAMPO_EDUCADOR])
                        .filter(Boolean)
                        .map(Number)
                )
            ];

            const idsEspecialidades = [
                ...new Set(
                    respuestas
                        .map(r => (r.datos_limpios as any)?.[CAMPO_ESPECIALIDAD])
                        .filter(Boolean)
                        .map(Number)
                )
            ];

            // Queries en paralelo
            const [educadores, especialidades] = await Promise.all([
                prisma.usuario.findMany({
                    where: { id_usuario: { in: idsEducadores } },
                    select: { id_usuario: true, nombres: true, apellidos: true }
                }),
                prisma.catalogItem.findMany({
                    where: { id_catalog_item: { in: idsEspecialidades } },
                    select: { id_catalog_item: true, nombre: true }
                })
            ]);

            const educadorMap = new Map(educadores.map(e => [e.id_usuario, e]));
            const especialidadMap = new Map(especialidades.map(e => [e.id_catalog_item, e]));

            const data = respuestas.map(r => {
                const datos = r.datos_limpios as any ?? {};
                const idEducador = Number(datos[CAMPO_EDUCADOR]);
                const idEspecialidad = Number(datos[CAMPO_ESPECIALIDAD]);
                const realizoSesion = datos[CAMPO_REALIZO_SESION];
                const educador = educadorMap.get(idEducador);
                const especialidad = especialidadMap.get(idEspecialidad);

                return {
                    id_respuesta: r.id_respuesta,
                    fecha_registro: r.fecha_registro,
                    realizo_sesion: realizoSesion == 23 || realizoSesion === '23' ? 'Sí' : 'No',
                    educador: educador
                        ? `${educador.nombres} ${educador.apellidos}`
                        : '—',
                    especialidad: especialidad?.nombre ?? '—',
                    evaluador: r.usuario
                        ? `${r.usuario.nombres} ${r.usuario.apellidos}`
                        : '—',
                };
            });

            return {
                data,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
            };
        } catch (error) {
            logger.error('Error al obtener evaluaciones de docentes', error);
            throw error;
        }
    }

}

export const formResponseService = new FormResponseService();