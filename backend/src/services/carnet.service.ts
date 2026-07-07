import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { ConflictError } from "@/utils/appError";
import {
    // CARNET_FORM_UUID,
    CARNET_MES_FIELD_ID,
    CARNET_REGION_ASISTENCIA,
    CARNET_REGION_HUELLA,
    REGION_CARNET_PERSONA,
    CARNET_TIENE_CUI_FIELD_ID,
    MES_BIMESTRE_MAP,
} from "@/constants/form-regions.constants";
import { qrService } from "./qr.service";

export class CarnetService {

    // ============================================
    // PROCESO COMPLETO — llamar desde saveResponse
    // ============================================

    // async procesarCarnet(
    //     tx: any,
    //     estructura: any,
    //     responses: Record<string, any>,
    //     id_comunidad: number | null,
    //     id_respuesta: number
    // ): Promise<void> {

    //     // ✅ Verificar que es el formulario de carnet
    //     const esCarnet = estructura.regions.some(
    //         (r: any) => r.id === REGION_CARNET_PERSONA
    //     );
    //     if (!esCarnet) return;

    //     // ✅ 1. Extraer datos de la persona
    //     const regionPersona = estructura.regions.find(
    //         (r: any) => r.id === REGION_CARNET_PERSONA
    //     );
    //     if (!regionPersona) return;

    //     const personaData = this.extractPersonaData(regionPersona, responses);
    //     if (!personaData.cui) return;

    //     // ✅ 2. Detectar si tiene CUI real o código temporal
    //     const tieneCui = responses[CARNET_TIENE_CUI_FIELD_ID];
    //     // 23 = Sí tiene CUI, 24 = No tiene CUI
    //     const registroIncompleto = String(tieneCui) === '24';

    //     // ✅ 3. Buscar o crear la persona
    //     const persona = await this.upsertPersonaCarnet(
    //         tx,
    //         personaData,
    //         id_comunidad,
    //         registroIncompleto,
    //         id_respuesta
    //     );

    //     // ✅ 4. Si viene cui_madre, buscar familia y agregar como integrante
    //     if (personaData.cui_madre) {
    //         await this.asignarAFamilia(tx, persona.id_persona, personaData.cui_madre);
    //         // await this.asignarAFamilia(tx, persona.id_persona, personaData.cui_madre, id_comunidad);
    //     }

    //     // ✅ 5. Extraer mes y calcular bimestre
    //     const mes = Number(responses[CARNET_MES_FIELD_ID]);
    //     if (!mes || !MES_BIMESTRE_MAP[mes]) return;

    //     const bimestre = MES_BIMESTRE_MAP[mes];

    //     // ✅ 6. Extraer huellas
    //     const huellas = this.extractHuellas(estructura, responses);
    //     // const huellas = this.extractHuellas(estructura, responses, visibleElements);

    //     // ✅ 7. Guardar o actualizar el bimestre
    //     await this.upsertCarnetBimestre(
    //         tx,
    //         id_respuesta,
    //         persona.id_persona,
    //         mes,
    //         bimestre,
    //         huellas
    //     );

    //     logger.info(`✅ Carnet procesado: persona ${persona.id_persona} mes ${mes} bimestre ${bimestre}`);
    // }
    async procesarCarnet(
        tx: any,
        estructura: any,
        responses: Record<string, any>,
        id_comunidad: number | null,
        id_respuesta: number
    ): Promise<void> {

        const esCarnet = estructura.regions.some(
            (r: any) => r.id === REGION_CARNET_PERSONA
        );
        if (!esCarnet) {
            logger.warn(`⚠️ [procesarCarnet] No es formulario de carnet (respuesta ${id_respuesta})`);
            return;
        }

        const regionPersona = estructura.regions.find(
            (r: any) => r.id === REGION_CARNET_PERSONA
        );
        if (!regionPersona) {
            logger.warn(`⚠️ [procesarCarnet] No se encontró regionPersona (respuesta ${id_respuesta})`);
            return;
        }

        const personaData = this.extractPersonaData(regionPersona, responses);
        logger.info(`🔍 [procesarCarnet] personaData extraída (respuesta ${id_respuesta}):`, personaData);

        if (!personaData.cui) {
            logger.warn(`⚠️ [procesarCarnet] personaData.cui está VACÍO — se detiene aquí (respuesta ${id_respuesta})`);
            return;
        }

        const tieneCui = responses[CARNET_TIENE_CUI_FIELD_ID];
        const registroIncompleto = String(tieneCui) === '24';
        logger.info(`🔍 [procesarCarnet] tieneCui=${tieneCui}, registroIncompleto=${registroIncompleto}`);

        const persona = await this.upsertPersonaCarnet(
            tx, personaData, id_comunidad, registroIncompleto, id_respuesta
        );
        logger.info(`✅ [procesarCarnet] persona resuelta: id_persona=${persona.id_persona} (respuesta ${id_respuesta})`);

        if (personaData.cui_madre) {
            await this.asignarAFamilia(tx, persona.id_persona, personaData.cui_madre);
        }

        const mes = Number(responses[CARNET_MES_FIELD_ID]);
        logger.info(`🔍 [procesarCarnet] mes=${mes}, bimestreMap=${MES_BIMESTRE_MAP[mes]}`);

        if (!mes || !MES_BIMESTRE_MAP[mes]) {
            logger.warn(`⚠️ [procesarCarnet] mes inválido o sin bimestre — se detiene aquí SIN crear bimestre (respuesta ${id_respuesta}, persona ${persona.id_persona})`);
            return;
        }

        const bimestre = MES_BIMESTRE_MAP[mes];
        const huellas = this.extractHuellas(estructura, responses);

        await this.upsertCarnetBimestre(
            tx, id_respuesta, persona.id_persona, mes, bimestre, huellas
        );

        logger.info(`✅ Carnet procesado: persona ${persona.id_persona} mes ${mes} bimestre ${bimestre}`);
    }

    // ============================================
    // BUSCAR O CREAR PERSONA DEL CARNET
    // ============================================

    private async upsertPersonaCarnet(
        tx: any,
        data: Record<string, any>,
        id_comunidad: number | null,
        registroIncompleto: boolean,
        id_respuesta: number
    ) {
        const respuestaPersona = await tx.formularioRespuestaPersona.findFirst({
            where: { id_respuesta },
            include: { persona: true }
        });

        let personaExistente = respuestaPersona?.persona || null;

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
            const persona = await tx.persona.update({
                where: { id_persona: personaExistente.id_persona },
                data: {
                    cui: data.cui,
                    ...(data.nombres ? { nombres: data.nombres } : {}),
                    ...(data.apellidos ? { apellidos: data.apellidos } : {}),
                    ...(data.fecha_nacimiento ? { fecha_nacimiento: data.fecha_nacimiento } : {}),
                    ...(data.sexo ? { sexo: Number(data.sexo) } : {}),
                    ...(data.fecha_ingreso_programa ? { fecha_ingreso_programa: data.fecha_ingreso_programa } : {}),
                    ...(data.cui_madre ? { cui_madre: data.cui_madre } : {}),
                    ...(id_comunidad ? { id_comunidad } : {}),
                    registro_incompleto: registroIncompleto,
                }
            });

            await this.vincularRespuestaPersona(tx, id_respuesta, persona.id_persona);

            return persona;
        }

        // Crear nueva persona
        const persona = await tx.persona.create({
            data: {
                cui: data.cui,
                nombres: data.nombres || '',
                apellidos: data.apellidos || '',
                fecha_nacimiento: data.fecha_nacimiento || null,
                sexo: data.sexo ? Number(data.sexo) : null,
                fecha_ingreso_programa: data.fecha_ingreso_programa || null,
                cui_madre: data.cui_madre || null,
                tipo_persona: 'persona',
                id_comunidad: id_comunidad || null,
                registro_incompleto: registroIncompleto,
            }
        });

        await this.vincularRespuestaPersona(tx, id_respuesta, persona.id_persona);

        return persona;
    }



    // ============================================
    // ASIGNAR A FAMILIA POR CUI MADRE
    // ============================================

    private async asignarAFamilia(
        tx: any,
        id_persona: number,
        cui_madre: string,
        // id_comunidad: number | null
    ): Promise<void> {
        try {
            const madre = await tx.persona.findFirst({
                where: {
                    OR: [
                        { cui: cui_madre },
                        { codigo_temporal: cui_madre }
                    ]
                }
            });

            if (!madre) return;

            const familia = await tx.familia.findFirst({
                where: {
                    id_madre: madre.id_persona,
                    estado_registro: true
                }
            });

            if (!familia) return;

            // ✅ Agregar como integrante si no existe
            await tx.familiaIntegrante.upsert({
                where: {
                    id_familia_id_persona: {
                        id_familia: familia.id_familia,
                        id_persona
                    }
                },
                create: {
                    id_familia: familia.id_familia,
                    id_persona,
                    rol: 'NINO' as any,
                },
                update: {}
            });

            logger.info(`✅ Persona ${id_persona} asignada a familia ${familia.id_familia}`);
        } catch (error) {
            logger.error('Error asignando persona a familia', error);
        }
    }

    // ============================================
    // GUARDAR O ACTUALIZAR BIMESTRE
    // ============================================

    private async upsertCarnetBimestre(
        tx: any,
        id_respuesta: number,
        id_persona: number,
        mes: number,
        bimestre: number,
        huellas: any[]
    ) {
        return tx.carnetBimestre.upsert({
            where: {
                id_respuesta_mes: {
                    id_respuesta,
                    mes
                }
            },
            create: {
                id_respuesta,
                id_persona,
                mes,
                bimestre,
                huellas,
            },
            update: {
                huellas,
                bimestre,
            }
        });
    }

    // ============================================
    // EXTRAER HUELLAS DEL PAYLOAD
    // ============================================

    private extractHuellas(
        estructura: any,
        responses: Record<string, any>,
        // visibleElements?: string[]
    ): any[] {
        const huellas: any[] = [];

        // ✅ Obtener cantidad de huellas del campo trigger
        const regionAsistencia = estructura.regions.find(
            (r: any) => r.id === CARNET_REGION_ASISTENCIA
        );
        if (!regionAsistencia) return huellas;

        const elementoCantidad = (regionAsistencia.children ?? regionAsistencia.elements)?.[0];

        const cantidad = parseInt(responses[elementoCantidad.id] || '0');

        if (cantidad === 0) return huellas;

        // ✅ Extraer cada huella de las repeticiones
        const regionHuella = estructura.regions.find(
            (r: any) => r.id === CARNET_REGION_HUELLA
        );
        if (!regionHuella) return huellas;

        const elementoFecha = (regionHuella.children ?? regionHuella.elements).find((e: any) => e.label === 'Fecha');
        const elementoSesion = (regionHuella.children ?? regionHuella.elements).find((e: any) => e.label === 'Sesión');

        for (let i = 1; i <= cantidad; i++) {
            const fechaId = `${elementoFecha.id}_rep${i}`;
            const sesionId = `${elementoSesion.id}_rep${i}`;

            const fecha = responses[fechaId];
            const sesion = responses[sesionId];

            if (!fecha) continue;

            huellas.push({
                fecha: fecha instanceof Date
                    ? fecha.toISOString().split('T')[0]
                    : String(fecha),
                sesion: sesion ? Number(sesion) : null
            });
        }

        return huellas;
    }

    // ============================================
    // EXTRAER DATOS DE PERSONA
    // ============================================

    private extractPersonaData(
        region: any,
        responses: Record<string, any>
    ): Record<string, any> {
        const personaData: Record<string, any> = {};

        const camposEstructurados = [
            'cui', 'nombres', 'apellidos', 'fecha_nacimiento',
            'sexo', 'fecha_ingreso_programa', 'cui_madre'
        ];

        for (const element of (region.children ?? region.elements)) {
            const fieldRole = element.fieldRole;
            if (!fieldRole) continue;

            const valor = responses[element.id];
            if (!valor && valor !== 0) continue;

            if (camposEstructurados.includes(fieldRole)) {
                if (fieldRole === 'fecha_nacimiento' || fieldRole === 'fecha_ingreso_programa') {
                    personaData[fieldRole] = new Date(valor);
                } else {
                    personaData[fieldRole] = String(valor);
                }
            }
        }

        return personaData;
    }

    // ============================================
    // CONSULTAS
    // ============================================

    async getCarnetPersonas(filters: {
        id_comunidad?: number;
        id_formulario: number;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {
            id_formulario: filters.id_formulario,
            estado_registro: true,
        };

        if (filters.id_comunidad) where.id_comunidad = filters.id_comunidad;

        const [total, respuestas] = await Promise.all([
            prisma.formularioRespuesta.count({ where }),
            prisma.formularioRespuesta.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fecha_registro: 'desc' },
                include: {
                    personas: {
                        include: {
                            persona: {
                                select: {
                                    id_persona: true,
                                    cui: true,
                                    codigo_temporal: true,
                                    nombres: true,
                                    apellidos: true,
                                    registro_incompleto: true,
                                    qr_path: true,
                                    comunidad: {
                                        select: {
                                            id_comunidad: true,
                                            nombre: true,
                                        }
                                    }
                                }
                            }
                        }
                    },
                    carnetBimestres: {
                        where: { estado_registro: true },
                        orderBy: { mes: 'asc' },
                        select: {
                            id_carnet_bimestre: true,
                            mes: true,
                            bimestre: true,
                            huellas: true,
                        }
                    }
                }
            })
        ]);

        // ✅ Aplanar para devolver una persona por fila
        const data = respuestas.map(r => {
            const personaRel = r.personas?.[0];
            return {
                id_respuesta: r.id_respuesta,
                persona: personaRel?.persona || null,
                bimestres: r.carnetBimestres || [],
                fecha_registro: r.fecha_registro,
            };
        }).filter(r => r.persona !== null);

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getBimestreData(id_respuesta: number, mes: number) {
        return prisma.carnetBimestre.findUnique({
            where: {
                id_respuesta_mes: {
                    id_respuesta,
                    mes
                }
            }
        });
    }

    async getPersonaByCodigoTemporal(codigo_temporal: string) {
        const persona = await prisma.persona.findFirst({
            where: { codigo_temporal },
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
    }

    // ✅ Generar el QR de una persona bajo demanda (al hacer clic)
    async generarQrPersonaOnDemand(id_persona: number): Promise<{ qr_path: string }> {
        const persona = await prisma.persona.findUnique({
            where: { id_persona }
        });

        if (!persona) throw new ConflictError('Persona no encontrada');

        // ✅ Si ya tiene QR, devolverlo sin regenerar
        if (persona.qr_path) {
            return { qr_path: persona.qr_path };
        }

        // ✅ Generar el QR
        const { qr_path } = await qrService.generarQrPersona(
            persona.id_persona,
            persona.cui,
            `${persona.nombres} ${persona.apellidos}`
        );

        // ✅ Guardar la ruta para clics posteriores
        await prisma.persona.update({
            where: { id_persona },
            data: { qr_path }
        });

        logger.info(`✅ QR generado bajo demanda para persona ${id_persona}`);
        return { qr_path };
    }

    private async vincularRespuestaPersona(
        tx: any,
        id_respuesta: number,
        id_persona: number
    ): Promise<void> {
        const relacionExistente = await tx.formularioRespuestaPersona.findFirst({
            where: { id_respuesta, id_persona }
        });

        if (relacionExistente) {
            logger.info(`Relación ya existe: respuesta ${id_respuesta} -> persona ${id_persona}, no se hace nada`);
            return;
        }

        await tx.formularioRespuestaPersona.create({
            data: { id_respuesta, id_persona, rol_en_form: 'persona' }
        });
        logger.info(`Relación creada: respuesta ${id_respuesta} -> persona ${id_persona}`);
    }
}

export const carnetService = new CarnetService();