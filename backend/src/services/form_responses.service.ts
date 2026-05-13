import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { SaveResponseInput } from "@/interface/formResponseInterface";
import { ConflictError } from "@/utils/appError";
import { cacheService } from "./cache.service";

const KEY_CATALOG = 'forms'

export class FormResponseService {

    async saveResponse(input: SaveResponseInput) {
        const { id_usuario, responses, estructura, visibleElements } = input;
        const cacheKey = `${KEY_CATALOG}:info:${input.id_formulario}`;

        // ✅ 1. Verificar que el formulario existe y obtener su versión
        const formulario = await prisma.formulario.findFirst({
            where: {
                OR: [
                    { uuid: String(input.id_formulario) },        // si viene UUID
                    { id_formulario: Number(input.id_formulario) || 0 } // si viene numérico
                ],
                estado_registro: true
            }
        });

        if (!formulario) {
            throw new ConflictError('Formulario no encontrado');
        }
        const id_formulario = formulario.id_formulario;

        // ✅ 2. Limpiar respuestas: solo campos visibles y con valor
        const datos_limpios = this.cleanResponses(responses, visibleElements);

        // ✅ 3. Extraer id_comunidad e id_departamento para desnormalizar
        const { id_comunidad, id_departamento } = await this.extractLocationIds(
            estructura,
            responses,
            visibleElements
        );

        // ✅ 4. Identificar regiones persona visibles
        const regionesPersona = estructura.regions.filter(region =>
            region.regionType === 'persona' &&
            visibleElements.includes(region.id)
        );

        // ✅ 5. Guardar todo en una transacción
        const resultado = await prisma.$transaction(async (tx) => {

            // 5.1 Crear la respuesta principal
            const respuesta = await tx.formularioRespuesta.create({
                data: {
                    id_formulario,
                    id_usuario: id_usuario || null,
                    version_form: formulario.version,
                    datos: responses,
                    datos_limpios,
                    id_comunidad: id_comunidad || null,
                    id_departamento: id_departamento || null,
                }
            });

            // 5.2 Procesar cada región persona
            for (const region of regionesPersona) {
                const personaData = this.extractPersonaData(region, responses);

                // Saltar si no tiene CUI
                if (!personaData.cui) continue;

                // Determinar tipo de persona por el título de la región
                const tipo_persona = this.detectTipoPersona(region);

                // Upsert en tabla Persona
                const persona = await tx.persona.upsert({
                    where: { cui: personaData.cui },
                    create: {
                        cui: personaData.cui,
                        nombres: personaData.nombres || '',
                        apellidos: personaData.apellidos || '',
                        fecha_nacimiento: personaData.fecha_nacimiento || null,
                        sexo: Number(personaData.sexo) || null,
                        direccion: personaData.direccion || null,
                        fecha_ingreso_programa: personaData.fecha_ingreso_programa || null,
                        cui_madre: personaData.cui_madre || null,
                        tipo_persona,
                        id_comunidad: id_comunidad || null,
                        datos_extra: personaData.datos_extra || null,
                    },
                    update: {
                        ...(personaData.nombres ? { nombres: personaData.nombres } : {}),
                        ...(personaData.apellidos ? { apellidos: personaData.apellidos } : {}),
                        ...(personaData.fecha_nacimiento ? { fecha_nacimiento: personaData.fecha_nacimiento } : {}),
                        ...(personaData.sexo ? { sexo: Number(personaData.sexo) } : {}),
                        ...(personaData.direccion ? { direccion: personaData.direccion } : {}),
                        ...(personaData.fecha_ingreso_programa ? { fecha_ingreso_programa: personaData.fecha_ingreso_programa } : {}),
                        ...(personaData.cui_madre ? { cui_madre: personaData.cui_madre } : {}),
                        ...(id_comunidad ? { id_comunidad } : {}),
                        ...(personaData.datos_extra ? { datos_extra: personaData.datos_extra } : {}),
                    }
                });

                // Crear relación respuesta <-> persona
                await tx.formularioRespuestaPersona.create({
                    data: {
                        id_respuesta: respuesta.id_respuesta,
                        id_persona: persona.id_persona,
                        rol_en_form: tipo_persona
                    }
                });
            }

            return respuesta;
        });
        cacheService.delete(cacheKey);
        logger.info(`✅ Respuesta guardada: ${resultado.id_respuesta}`);
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
        const cleaned: Record<string, any> = {};

        for (const [key, value] of Object.entries(responses)) {
            // ✅ Verificar ID directo O si es una repetición de un elemento visible
            const baseId = key.includes('_rep') ? key.replace(/_rep\d+$/, '') : key;
            const isVisible = visibleElements.includes(key) || visibleElements.includes(baseId);

            if (!isVisible) continue;

            if (value === null || value === undefined || value === '') continue;
            if (Array.isArray(value) && value.length === 0) continue;

            cleaned[key] = value;
        }

        return cleaned;
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

        // Buscar catálogos de comunidad y departamento en los elementos
        for (const region of estructura.regions) {
            for (const element of region.elements) {
                if (!visibleElements.includes(element.id)) continue;

                const valor = responses[element.id];
                if (!valor) continue;

                const catalogType = (element as any).catalogType;
                if (!catalogType) continue;

                // Verificar si es catálogo de comunidad o departamento
                const catalog = await prisma.catalog.findUnique({
                    where: { id_catalogo: Number(catalogType) }
                });

                if (catalog?.tabla_origen === 'comunidad') {
                    id_comunidad = Number(valor);

                    // Obtener departamento de la comunidad
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
     * Extrae los datos de persona de una región usando fieldRole
     */
    private extractPersonaData(
        region: SaveResponseInput['estructura']['regions'][0],
        responses: Record<string, any>
    ): Record<string, any> {
        const personaData: Record<string, any> = {};
        const datosExtra: Record<string, any> = {};

        const camposEstructurados = [
            'cui', 'nombres', 'apellidos', 'fecha_nacimiento',
            'sexo', 'direccion', 'fecha_ingreso_programa', 'cui_madre'
        ];

        for (const element of region.elements) {
            const fieldRole = (element as any).fieldRole;
            const valor = responses[element.id];

            if (!valor && valor !== 0) continue;

            if (fieldRole && camposEstructurados.includes(fieldRole)) {
                // Campo estructurado va a columna real
                if (fieldRole === 'fecha_nacimiento' || fieldRole === 'fecha_ingreso_programa') {
                    personaData[fieldRole] = new Date(valor);
                } else {
                    personaData[fieldRole] = String(valor);
                }
            } else if (fieldRole) {
                // Campo con fieldRole pero no estructurado va a datos_extra
                datosExtra[fieldRole] = valor;
            }
        }

        if (Object.keys(datosExtra).length > 0) {
            personaData.datos_extra = datosExtra;
        }

        return personaData;
    }

    /**
     * Detecta el tipo de persona según el título de la región
     */
    private detectTipoPersona(
        region: SaveResponseInput['estructura']['regions'][0]
    ): string {
        const title = region.title?.toLowerCase() || '';

        if (title.includes('embarazada') || title.includes('madre')) {
            return 'embarazada';
        }
        if (title.includes('niño') || title.includes('nino') || title.includes('bebe')) {
            return 'nino';
        }
        return 'persona';
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

    async updateResponse(id_respuesta: number, datos: Record<string, any>): Promise<any> {
        try {
            const existing = await prisma.formularioRespuesta.findUnique({
                where: { id_respuesta }
            });
            if (!existing) throw new ConflictError('Respuesta no encontrada');

            const updated = await prisma.formularioRespuesta.update({
                where: { id_respuesta },
                data: {
                    datos,
                    datos_limpios: datos,
                    fecha_edicion: new Date()
                }
            });
            return updated;
        } catch (error) {
            logger.error('Error al editar respuesta', error);
            throw error;
        }
    }
}

export const formResponseService = new FormResponseService();