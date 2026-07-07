import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { REGION_MADRE, REGION_ROL_MAP, ROL_FAMILIA } from "@/constants/form-regions.constants";
import { ConflictError } from "@/utils/appError";

export class FamiliaService {
    //Generar código interno
    private async generarCodigoFamilia(): Promise<string> {
        const anio = new Date().getFullYear();
        const total = await prisma.familia.count({
            where: {
                fecha_registro: {
                    gte: new Date(`${anio}-01-01`),
                    lte: new Date(`${anio}-12-31`)
                }
            }
        });
        const correlativo = String(total + 1).padStart(5, '0');
        return `FAM-${anio}-${correlativo}`;
    }

    extractPersonasFromResponse(
        estructura: any,
        responses: Record<string, any>,
        visibleElements: string[]
    ): Array<{
        regionId: string;
        rol: string;
        repIndex: number;
        data: Record<string, any>;
    }> {
        const personas: Array<{
            regionId: string;
            rol: string;
            repIndex: number;
            data: Record<string, any>;
        }> = [];

        const regionesPersona = estructura.regions.filter(
            (r: any) => r.regionType === 'persona'
        );

        for (const region of regionesPersona) {
            const rol = REGION_ROL_MAP[region.id];
            if (!rol) continue;

            const esRepetida = region.repeatConfig?.enabled === true;

            if (esRepetida) {
                // Detectar cuántas repeticiones hay en las respuestas
                // Buscar el campo trigger para saber cuántas veces se repite
                const triggerFieldId = region.repeatConfig?.triggerFieldId;
                const cantidad = parseInt(responses[triggerFieldId] || '0');

                for (let i = 1; i <= cantidad; i++) {
                    // Verificar que esta repetición esté visible
                    // const regionRepId = `${region.id}_rep${i}`;
                    const estaVisible = region.children.some((el: any) => {
                        const elRepId = `${el.id}_rep${i}`;
                        return visibleElements.includes(elRepId);
                    });

                    if (!estaVisible) continue;

                    const data = this.extractPersonaFields(region, responses, i);
                    if (!data.cui) continue;

                    personas.push({
                        regionId: region.id,
                        rol,
                        repIndex: i,
                        data
                    });
                }
            } else {
                // Región no repetida — verificar que esté visible
                const estaVisible = visibleElements.includes(region.id);
                if (!estaVisible) continue;

                const data = this.extractPersonaFields(region, responses, 0);
                if (!data.cui) continue;

                personas.push({
                    regionId: region.id,
                    rol,
                    repIndex: 0,
                    data
                });
            }
        }

        return personas;
    }


    // Extraer campos de una persona
    private extractPersonaFields(
        region: any,
        responses: Record<string, any>,
        repIndex: number
    ): Record<string, any> {
        const personaData: Record<string, any> = {};
        const datosExtra: Record<string, any> = {};

        const camposEstructurados = [
            'cui', 'nombres', 'apellidos', 'fecha_nacimiento',
            'sexo', 'direccion', 'fecha_ingreso_programa', 'cui_madre'
        ];

        for (const element of region.children) {
            const fieldRole = element.fieldRole;
            if (!fieldRole) continue;

            // Construir el ID con el índice de repetición
            const elementId = repIndex > 0
                ? `${element.id}_rep${repIndex}`
                : element.id;

            const valor = responses[elementId];
            if (!valor && valor !== 0) continue;

            if (camposEstructurados.includes(fieldRole)) {
                if (fieldRole === 'fecha_nacimiento' || fieldRole === 'fecha_ingreso_programa') {
                    personaData[fieldRole] = new Date(valor);
                } else {
                    personaData[fieldRole] = String(valor);
                }
            } else {
                datosExtra[fieldRole] = valor;
            }
        }

        if (Object.keys(datosExtra).length > 0) {
            personaData.datos_extra = datosExtra;
        }

        return personaData;
    }

    async upsertPersona(
        tx: any,
        data: Record<string, any>,
        rol: string,
        id_comunidad: number | null,
        esMadre: boolean = false,
        id_respuesta?: number,
        repIndex: number = 0  // ✅ nuevo parámetro
    ) {
        const tipoPersona = this.rolToTipoPersona(rol);
        let personaExistente = null;

        // ✅ Si viene id_respuesta buscar por cui o codigo_temporal primero
        // Para niños con repIndex > 0 no buscar por respuesta porque puede traer el niño equivocado
        if (id_respuesta && repIndex === 0) {
            const respuestaPersona = await tx.formularioRespuestaPersona.findFirst({
                where: {
                    id_respuesta,
                    rol_en_form: tipoPersona
                },
                include: { persona: true }
            });
            personaExistente = respuestaPersona?.persona || null;
        }

        // ✅ Buscar por cui o codigo_temporal — funciona para todos los casos
        if (!personaExistente) {
            personaExistente = await tx.persona.findFirst({
                where: {
                    OR: [
                        { cui: data.cui },
                        { codigo_temporal: data.cui }
                    ]
                }
            });
        }

        if (personaExistente) {
            return tx.persona.update({
                where: { id_persona: personaExistente.id_persona },
                data: {
                    cui: data.cui,
                    ...(data.nombres ? { nombres: data.nombres } : {}),
                    ...(data.apellidos ? { apellidos: data.apellidos } : {}),
                    ...(data.fecha_nacimiento ? { fecha_nacimiento: data.fecha_nacimiento } : {}),
                    ...(data.sexo ? { sexo: Number(data.sexo) } : {}),
                    ...(data.direccion ? { direccion: data.direccion } : {}),
                    ...(data.fecha_ingreso_programa ? { fecha_ingreso_programa: data.fecha_ingreso_programa } : {}),
                    ...(data.cui_madre ? { cui_madre: data.cui_madre } : {}),
                    ...(id_comunidad ? { id_comunidad } : {}),
                    ...(data.datos_extra ? { datos_extra: data.datos_extra } : {}),
                    ...(esMadre ? { codigo_temporal: personaExistente.codigo_temporal } : {}),
                }
            });
        }

        return tx.persona.create({
            data: {
                cui: data.cui,
                nombres: data.nombres || '',
                apellidos: data.apellidos || '',
                fecha_nacimiento: data.fecha_nacimiento || null,
                sexo: data.sexo ? Number(data.sexo) : null,
                direccion: data.direccion || null,
                fecha_ingreso_programa: data.fecha_ingreso_programa || null,
                cui_madre: data.cui_madre || null,
                tipo_persona: tipoPersona,
                id_comunidad: id_comunidad || null,
                datos_extra: data.datos_extra || null,
                ...(esMadre ? { codigo_temporal: data.cui } : {}),
            }
        });
    }
    // Buscar o crear familia
    async upsertFamilia(
        tx: any,
        id_madre: number,
        id_comunidad: number,
        id_respuesta?: number  // ✅ nuevo parámetro opcional
    ) {
        // ✅ Si viene id_respuesta, buscar familia vinculada a esa respuesta
        if (id_respuesta) {
            const respuestaExistente = await tx.formularioRespuesta.findUnique({
                where: { id_respuesta },
                select: { id_familia: true }
            });

            if (respuestaExistente?.id_familia) {
                const familia = await tx.familia.findUnique({
                    where: { id_familia: respuestaExistente.id_familia }
                });

                if (familia) {
                    // ✅ Actualizar id_madre por si cambió el CUI
                    return tx.familia.update({
                        where: { id_familia: familia.id_familia },
                        data: { id_madre }
                    });
                }
            }
        }

        // Buscar por id_madre e id_comunidad como antes
        const familiaExistente = await tx.familia.findFirst({
            where: { id_madre, id_comunidad, estado_registro: true }
        });

        if (familiaExistente) return familiaExistente;

        const codigo = await this.generarCodigoFamilia();
        return tx.familia.create({
            data: { codigo, id_comunidad, id_madre }
        });
    }

    // Agregar integrante a familia
    async upsertIntegrante(
        tx: any,
        id_familia: number,
        id_persona: number,
        rol: string
    ) {
        return tx.familiaIntegrante.upsert({
            where: {
                id_familia_id_persona: {
                    id_familia,
                    id_persona
                }
            },
            create: {
                id_familia,
                id_persona,
                rol: rol as any,
            },
            update: {
                rol: rol as any,
            }
        });
    }


    // ============================================
    // PROCESO COMPLETO
    // Llamar desde saveResponse dentro de la transacción
    // ============================================

    async procesarFamilia(
        tx: any,
        estructura: any,
        responses: Record<string, any>,
        visibleElements: string[],
        id_comunidad: number | null,
        id_respuesta?: number
    ): Promise<number | null> {

        const esFormularioFamilia = estructura.regions.some(
            (r: any) => r.id === REGION_MADRE
        );

        if (!esFormularioFamilia || !id_comunidad) return null;

        const personas = this.extractPersonasFromResponse(
            estructura,
            responses,
            visibleElements
        );

        if (personas.length === 0) return null;

        const madreData = personas.find(p => p.rol === ROL_FAMILIA.MADRE);
        if (!madreData) return null;

        const cuiMadre: string | null = madreData.data.cui || null;

        // ✅ 1. Crear o actualizar la madre
        const madre = await this.upsertPersona(
            tx,
            madreData.data,
            ROL_FAMILIA.MADRE,
            id_comunidad,
            true,
            id_respuesta,
            0
        );
        logger.info(`👩 Madre procesada: ${madre.id_persona} CUI: ${madre.cui}`);

        // ✅ 2. Crear o encontrar la familia
        const familia = await this.upsertFamilia(
            tx,
            madre.id_persona,
            id_comunidad,
            id_respuesta
        );

        // ✅ 3. Agregar madre como integrante
        await this.upsertIntegrante(
            tx,
            familia.id_familia,
            madre.id_persona,
            ROL_FAMILIA.MADRE
        );

        // ✅ 4. Guardar relación respuesta <-> madre
        if (id_respuesta) {
            await this.upsertRespuestaPersona(
                tx,
                id_respuesta,
                madre.id_persona,
                'embarazada'
            );
        }

        // ✅ 5. Procesar el resto de integrantes
        for (const personaInfo of personas) {
            if (personaInfo.rol === ROL_FAMILIA.MADRE) continue;

            // ✅ Asignar cui_madre a los niños
            if (personaInfo.rol === ROL_FAMILIA.NINO && cuiMadre) {
                personaInfo.data.cui_madre = cuiMadre;
            }

            const persona = await this.upsertPersona(
                tx,
                personaInfo.data,
                personaInfo.rol,
                id_comunidad,
                false,
                id_respuesta,
                personaInfo.repIndex  // ✅ índice de repetición
            );

            await this.upsertIntegrante(
                tx,
                familia.id_familia,
                persona.id_persona,
                personaInfo.rol
            );

            // ✅ Guardar relación respuesta <-> persona
            if (id_respuesta) {
                const tipoPersona = this.rolToTipoPersona(personaInfo.rol);
                await this.upsertRespuestaPersona(
                    tx,
                    id_respuesta,
                    persona.id_persona,
                    tipoPersona
                );
            }
        }

        logger.info(`Familia procesada: ${familia.codigo}`);
        return familia.id_familia;
    }

    private async upsertRespuestaPersona(
        tx: any,
        id_respuesta: number,
        id_persona: number,
        rol_en_form: string
    ) {
        return tx.formularioRespuestaPersona.upsert({
            where: {
                id_respuesta_id_persona: {
                    id_respuesta,
                    id_persona
                }
            },
            create: { id_respuesta, id_persona, rol_en_form },
            update: { rol_en_form }
        });
    }


    // Helper
    private rolToTipoPersona(rol: string): string {
        const map: Record<string, string> = {
            [ROL_FAMILIA.MADRE]: 'embarazada',
            [ROL_FAMILIA.PADRE]: 'padre',
            [ROL_FAMILIA.NINO]: 'nino',
            [ROL_FAMILIA.ENCARGADO]: 'encargado',
        };
        return map[rol] || 'persona';
    }

    // ============================================
    // CONSULTAS
    // ============================================

    async getFamiliaById(id_familia: number) {
        return prisma.familia.findUnique({
            where: { id_familia },
            include: {
                madre: true,
                comunidad: {
                    include: { departamento: true }
                },
                integrantes: {
                    include: { persona: true }
                },
                respuestas: {
                    where: { estado_registro: true },
                    orderBy: { fecha_registro: 'desc' },
                    take: 10
                }
            }
        });
    }

    async getFamilias(filters: {
        id_comunidad?: number;
        id_departamento?: number;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { estado_registro: true };
        if (filters.id_comunidad) where.id_comunidad = filters.id_comunidad;
        if (filters.id_departamento) {
            where.comunidad = { id_departamento: filters.id_departamento };
        }
        const [total, familias] = await Promise.all([
            prisma.familia.count({ where }),
            prisma.familia.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fecha_registro: 'desc' },
                include: {
                    madre: {
                        select: {
                            id_persona: true,
                            cui: true,
                            nombres: true,
                            apellidos: true,
                            fecha_ingreso_programa: true,
                        }
                    },
                    comunidad: {
                        select: {
                            id_comunidad: true,
                            nombre: true,
                            departamento: {
                                select: { id_departamento: true, nombre: true }
                            }
                        }
                    },
                    // conteo de integrantes
                    _count: {
                        select: { integrantes: true }
                    },
                    respuestas: {
                        where: { estado_registro: true },
                        orderBy: { fecha_registro: 'desc' },
                        take: 1,
                        select: { id_respuesta: true }
                    }
                }
            })
        ]);

        return {
            data: familias,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getIntegrantes(id_familia: number) {
        const integrantes = await prisma.familiaIntegrante.findMany({
            where: {
                id_familia,
                estado_registro: true
            },
            include: {
                persona: {
                    select: {
                        id_persona: true,
                        cui: true,
                        nombres: true,
                        apellidos: true,
                        fecha_nacimiento: true,
                        tipo_persona: true,
                        datos_extra: true,
                    }
                }
            },
            orderBy: { rol: 'asc' }
        });

        return integrantes.map(i => ({
            id_persona: i.persona.id_persona,
            cui: i.persona.cui,
            nombres: i.persona.nombres,
            apellidos: i.persona.apellidos,
            fecha_nacimiento: i.persona.fecha_nacimiento,
            tipo_persona: i.persona.tipo_persona,
            rol: i.rol,
            datos_extra: i.persona.datos_extra,
        }));
    }

    async generarCodigoTemporal(
        nombres: string,
        apellidos: string,
        id_comunidad: number,
        fecha_inscripcion: string
    ): Promise<string> {

        //Obtener nombre de la comunidad
        const comunidad = await prisma.comunidad.findUnique({
            where: { id_comunidad },
            select: { nombre: true }
        });

        if (!comunidad) throw new ConflictError('Comunidad no encontrada');

        //Construir prefijo
        const letraNombre = nombres.trim()[0].toUpperCase();
        const letraApellido = apellidos.trim()[0].toUpperCase();

        const comunidadLimpia = comunidad.nombre
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z]/g, '')
            .toUpperCase();
        const letrasComunidad = comunidadLimpia.substring(0, 2);

        const fecha = new Date(fecha_inscripcion);
        const dia = String(fecha.getUTCDate()).padStart(2, '0');
        const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const anio = String(fecha.getUTCFullYear());
        const fechaStr = `${dia}${mes}${anio}`;

        const prefijo = `${letraNombre}${letraApellido}${letrasComunidad}${fechaStr}`;

        //Consultar cuántos códigos con ese prefijo existen
        const existentes = await prisma.persona.count({
            where: {
                codigo_temporal: {
                    startsWith: prefijo
                }
            }
        });

        //Generar correlativo
        const correlativo = String(existentes + 1).padStart(2, '0');
        const codigo = `${prefijo}${correlativo}`;

        //Guardar el código en un registro provisional
        await prisma.persona.create({
            data: {
                cui: codigo, // provisional hasta tener CUI real
                codigo_temporal: codigo,
                nombres: nombres,
                apellidos: apellidos,
                id_comunidad: id_comunidad,
            }
        });

        return codigo;
    }
}

export const familiaService = new FamiliaService();