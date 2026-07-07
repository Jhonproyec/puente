import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { personaService } from "./persona.service";


// ── Interfaces ───────────────────────────────────────────────────────

// interface HitosTablaRespuestaSync {
//     table_element_id: string;
//     row_id: string;
//     group_id: string;
//     col_id: string;
// }

interface HitosNinoSync {
    uuid: string;
    indice: number;
    responses: Record<string, any>;
    tabla_element_id?: string;
    estado: string;
    tablas_responses: Record<string, string>;
    // 👇 Campos estructurales nuevos
    nombres: string;
    apellidos: string;
    tiene_consentimiento: boolean;
}

interface HitosEncuestaSync {
    uuid: string;
    uuid_formulario: string;
    id_comunidad: number;
    cantidad_ninos: number;
    estado: string;
    created_by: string;
    created_at: string;
    id_usuario?: number | null;
    ninos: HitosNinoSync[];
}

interface ResultadoHitosEncuesta {
    uuid: string;
    success: boolean;
    id_encuesta?: number;
    error?: string;
}

// ── Servicio ─────────────────────────────────────────────────────────

export class HitosSyncService {

    async procesarEncuestas(
        encuestas: HitosEncuestaSync[]
    ): Promise<ResultadoHitosEncuesta[]> {
        const resultados: ResultadoHitosEncuesta[] = [];

        for (const encuesta of encuestas) {
            try {
                const resultado = await this.procesarEncuesta(encuesta);
                resultados.push(resultado);
                logger.info(`✅ Encuesta hitos sincronizada: ${encuesta.uuid}`);
            } catch (error: any) {
                logger.error(`❌ Error sincronizando encuesta hitos ${encuesta.uuid}`, error);
                resultados.push({
                    uuid: encuesta.uuid,
                    success: false,
                    error: error.message || 'Error desconocido',
                });
            }
        }

        return resultados;
    }

    private async procesarEncuesta(
        encuesta: HitosEncuestaSync
    ): Promise<ResultadoHitosEncuesta> {

        // Verificar si ya existe (idempotente)
        const existente = await prisma.hitosEncuesta.findUnique({
            where: { uuid: encuesta.uuid },
        });

        if (existente) {
            logger.info(`ℹ️ Encuesta ${encuesta.uuid} ya existe, actualizando...`);
        }

        // Obtener id_formulario desde UUID
        const formulario = await prisma.formulario.findUnique({
            where: { uuid: encuesta.uuid_formulario },
            select: { id_formulario: true },
        });

        if (!formulario) {
            throw new Error(`Formulario ${encuesta.uuid_formulario} no encontrado`);
        }

        // Upsert encuesta principal
        const hitosEncuesta = await prisma.hitosEncuesta.upsert({
            where: { uuid: encuesta.uuid },
            create: {
                uuid: encuesta.uuid,
                id_formulario: formulario.id_formulario,
                id_comunidad: encuesta.id_comunidad,
                id_usuario: encuesta.id_usuario ?? null,
                cantidad_ninos: encuesta.cantidad_ninos,
                estado: encuesta.estado,
                fecha_registro: new Date(encuesta.created_at),
            },
            update: {
                cantidad_ninos: encuesta.cantidad_ninos,
                estado: encuesta.estado,
                id_usuario: encuesta.id_usuario ?? null,
            },
        });

        // Procesar cada niño
        const ninos = encuesta.ninos ?? [];
        for (const nino of ninos) {
            await this.procesarNino(nino, hitosEncuesta.id_encuesta, encuesta.id_comunidad);
        }

        return {
            uuid: encuesta.uuid,
            success: true,
            id_encuesta: hitosEncuesta.id_encuesta,
        };
    }

    private async procesarNino(
        nino: HitosNinoSync,
        id_encuesta: number,
        id_comunidad: number,
    ): Promise<void> {
        // 👇 Leer campos estructurales directamente, no del responses
        const nombres = nino.nombres ?? '';
        const apellidos = nino.apellidos ?? '';
        const tieneConsentimiento = nino.tiene_consentimiento ?? false;

        // Buscar persona en BD si tiene CUI
        const responses = nino.responses;
        let idPersona: number | null = null;

        // Buscar CUI/código en responses por fieldRole pattern
        const cuiEntry = Object.entries(responses).find(([k]) =>
            k.startsWith('persona_cui_') &&
            k.endsWith('_0') &&
            !k.includes('madre')
        );
        const codigoEntry = Object.entries(responses).find(([k]) =>
            k.includes('codigo_temporal') && !k.startsWith('_')
        );

        const cui = cuiEntry?.[1] ? String(cuiEntry[1]) : null;
        const codigoTemporal = codigoEntry?.[1] ? String(codigoEntry[1]) : null;


        if (cui && String(cui).length >= 13) {
            const persona = await prisma.persona.findFirst({
                where: { cui: String(cui) },
                select: { id_persona: true },
            });
            idPersona = persona?.id_persona ?? null;
        } else if (codigoTemporal) {
            const persona = await prisma.persona.findFirst({
                where: { codigo_temporal: String(codigoTemporal) },
                select: { id_persona: true },
            });
            idPersona = persona?.id_persona ?? null;
        }

        // Upsert niño — guardar responses completo con IDs reales
        const hitosNino = await prisma.hitosNino.upsert({
            where: { uuid: nino.uuid },
            create: {
                uuid: nino.uuid,
                id_encuesta,
                id_persona: idPersona,
                indice: nino.indice,
                nombres,
                apellidos,
                tiene_consentimiento: tieneConsentimiento,
                tabla_element_id: nino.tabla_element_id ?? null,
                responses: responses, // 👈 JSON completo con IDs reales
            },
            update: {
                id_persona: idPersona,
                nombres,
                apellidos,
                tiene_consentimiento: tieneConsentimiento,
                tabla_element_id: nino.tabla_element_id ?? null,
                responses: responses, // 👈 JSON completo con IDs reales
            },
        });

        // Buscar o crear persona
        // Buscar campo tiene_cui en responses
        const tieneCuiEntry = Object.entries(responses).find(([k]) =>
            k.includes('tiene_cui') && !k.startsWith('_')
        );
        const tieneCuiReal = tieneCuiEntry?.[1]?.toString() === '23'; // 23 = Sí tiene CUI

        const personaResult = await personaService.upsertPersona({
            cui: tieneCuiReal && cui ? String(cui) : null,
            codigoTemporal: !tieneCuiReal && codigoTemporal ? String(codigoTemporal) : null,
            nombres,
            apellidos,
            idComunidad: id_comunidad,
            registroIncompleto: !tieneCuiReal,
        });

        // Actualizar id_persona en HitosNino
        await prisma.hitosNino.update({
            where: { id_nino: hitosNino.id_nino },
            data: { id_persona: personaResult.id_persona }
        });



        // Procesar respuestas de tabla
        if (Object.keys(nino.tablas_responses).length > 0) {
            await this.procesarTablas(
                hitosNino.id_nino,
                nino.tabla_element_id ?? '',
                nino.tablas_responses,
            );
        }
    }

    private async procesarTablas(
        id_nino: number,
        tableElementId: string,
        tablasResponses: Record<string, string>,
    ): Promise<void> {
        for (const [key, colId] of Object.entries(tablasResponses)) {
            // key = 'rowId||groupId'
            const separatorIdx = key.indexOf('||'); // 👈 separador correcto
            if (separatorIdx === -1) continue;
            const rowId = key.substring(0, separatorIdx);
            const groupId = key.substring(separatorIdx + 2);

            await prisma.hitosTablaRespuesta.upsert({
                where: {
                    id_nino_table_element_id_row_id_group_id: {
                        id_nino,
                        table_element_id: tableElementId,
                        row_id: rowId,
                        group_id: groupId,
                    },
                },
                create: {
                    id_nino,
                    table_element_id: tableElementId,
                    row_id: rowId,
                    group_id: groupId,
                    col_id: colId,
                },
                update: {
                    col_id: colId,
                },
            });
        }
    }
}

export const hitosSyncService = new HitosSyncService();