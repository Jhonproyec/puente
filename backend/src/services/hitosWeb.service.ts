import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { personaService } from "./persona.service";

interface HitosWebInput {
    responses: Record<string, any>;
    visibleElements: string[];
    id_usuario?: number | null;
    id_formulario: string;
    id_comunidad?: number | null;
}

interface HitosWebUpdateInput {
    id_encuesta: number;
    responses: Record<string, any>;
    visibleElements: string[];
    id_usuario?: number | null;
}

// ── IDs fijos del formulario de hitos ────────────────────────────────
const CAMPO_CANTIDAD_ID = 'element_1782401411522_1';
const CAMPO_TIENE_CUI_PATTERN = 'tiene_cui';
// const CAMPO_CUI_PATTERN = '_cui_';
// const CAMPO_CODIGO_TEMPORAL_PATTERN = 'codigo_temporal';
// const CAMPO_NOMBRES_ROLE = 'nombres';
// const CAMPO_APELLIDOS_ROLE = 'apellidos';
const CAMPO_CONSENTIMIENTO_PATTERN = 'element_1782401524081_5';

export class HitosWebService {

    // ── Guardar nueva encuesta desde la web ───────────────────────────
    async procesarDesdeWeb(input: HitosWebInput): Promise<{ id_encuesta: number }> {
        const { responses, id_usuario, id_formulario } = input;

        // Obtener id_formulario desde UUID
        const formulario = await prisma.formulario.findUnique({
            where: { uuid: id_formulario },
            select: { id_formulario: true, estructura: true }
        });
        if (!formulario) throw new Error('Formulario no encontrado');

        // Extraer cantidad de niños
        const cantidadNinos = Number(responses[CAMPO_CANTIDAD_ID] || 0);

        // Obtener id_comunidad desde responses si hay campo de comunidad
        const id_comunidad = input.id_comunidad || null;

        // Crear encuesta
        const hitosEncuesta = await prisma.hitosEncuesta.create({
            data: {
                // uuid,
                id_formulario: formulario.id_formulario,
                id_comunidad: id_comunidad || 1, // fallback temporal
                id_usuario: id_usuario || null,
                cantidad_ninos: cantidadNinos,
                estado: 'completa',
            }
        });

        // Deserializar y crear cada niño
        const estructura = formulario.estructura as any;
        const ninosParsed = this.deserializarNinos(responses, cantidadNinos, estructura);

        for (const ninoParsed of ninosParsed) {
            await this.crearNino(ninoParsed, hitosEncuesta.id_encuesta, id_comunidad);
        }

        logger.info(`✅ Encuesta hitos creada desde web: ${hitosEncuesta.id_encuesta}`);
        return { id_encuesta: hitosEncuesta.id_encuesta };
    }

    // ── Actualizar encuesta existente desde la web ────────────────────
    async actualizarDesdeWeb(input: HitosWebUpdateInput): Promise<{ id_encuesta: number }> {
        const { id_encuesta, responses } = input;

        const encuesta = await prisma.hitosEncuesta.findUnique({
            where: { id_encuesta },
            include: {
                ninos: { orderBy: { indice: 'asc' } },
                formulario: { select: { estructura: true, id_formulario: true } }
            }
        });
        if (!encuesta) throw new Error('Encuesta no encontrada');

        const cantidadNinos = Number(responses[CAMPO_CANTIDAD_ID] || encuesta.cantidad_ninos);
        const estructura = encuesta.formulario.estructura as any;
        const ninosParsed = this.deserializarNinos(responses, cantidadNinos, estructura);

        for (const ninoParsed of ninosParsed) {
            const ninoExistente = encuesta.ninos.find(n => n.indice === ninoParsed.indice);

            if (ninoExistente) {
                // Actualizar niño existente
                await this.actualizarNino(ninoParsed, ninoExistente.id_nino, encuesta.id_comunidad);
            } else {
                // Crear niño nuevo si se agregó
                await this.crearNino(ninoParsed, id_encuesta, encuesta.id_comunidad);
            }
        }

        // Actualizar cantidad si cambió
        await prisma.hitosEncuesta.update({
            where: { id_encuesta },
            data: { cantidad_ninos: cantidadNinos }
        });

        logger.info(`✅ Encuesta hitos actualizada desde web: ${id_encuesta}`);
        return { id_encuesta };
    }

    // ── Deserializar responses aplanados en niños ─────────────────────
    private deserializarNinos(
        responses: Record<string, any>,
        cantidadNinos: number,
        estructura: any
    ): NinoParsed[] {
        const ninos: NinoParsed[] = [];

        for (let i = 1; i <= cantidadNinos; i++) {
            const suffix = `_rep${i}`;
            const ninoResponses: Record<string, any> = {};
            const tablasResponses: Record<string, string> = {};
            let tablaElementId: string | null = null;

            for (const [key, valor] of Object.entries(responses)) {
                if (!key.endsWith(suffix)) continue;
                if (valor === null || valor === '' || valor === undefined) continue;

                const baseKey = key.slice(0, -suffix.length);

                // Detectar si es clave de tabla: tableId_repN_rowId_groupId
                // Formato: table_XXXX_repN_rowId_groupId
                // const tablaMatch = baseKey.match(/^(table_[^_]+(?:_\d+)?)\s*$/);

                // Mejor detección: si la clave contiene _repN_ en el medio
                const tablaKeyPattern = new RegExp(`^(.+?)${suffix}_(.+)_(.+)$`);
                const tablaKeyMatch = key.match(tablaKeyPattern);

                if (tablaKeyMatch) {
                    // Es una clave de tabla: tableId_repN_rowId_groupId
                    const tableId = tablaKeyMatch[1];
                    const rowId = tablaKeyMatch[2];
                    const groupId = tablaKeyMatch[3];
                    tablasResponses[`${rowId}_${groupId}`] = String(valor);
                    tablaElementId = tableId;
                } else {
                    // Es una clave de campo normal
                    ninoResponses[baseKey] = valor;
                }
            }

            // Extraer campos estructurales del niño
            const nombres = this.extractByFieldRole(ninoResponses, estructura, 'nombres') || '';
            const apellidos = this.extractByFieldRole(ninoResponses, estructura, 'apellidos') || '';

            // Detectar consentimiento
            const consentimientoVal = ninoResponses[CAMPO_CONSENTIMIENTO_PATTERN];
            const tieneConsentimiento = String(consentimientoVal) === '23';

            // Detectar CUI
            const cuiEntry = Object.entries(ninoResponses).find(([k]) =>
                k.startsWith('persona_cui_') &&
                k.endsWith('_0') &&
                !k.includes('madre')
            );
            const codigoEntry = Object.entries(ninoResponses).find(([k]) =>
                k.includes('codigo_temporal')
            );
            const tieneCuiEntry = Object.entries(ninoResponses).find(([k]) =>
                k.includes(CAMPO_TIENE_CUI_PATTERN)
            );

            const tieneCuiReal = tieneCuiEntry?.[1]?.toString() === '23';
            const cui = tieneCuiReal && cuiEntry ? String(cuiEntry[1]) : null;
            const codigoTemporal = !tieneCuiReal && codigoEntry ? String(codigoEntry[1]) : null;

            ninos.push({
                indice: i - 1,
                nombres,
                apellidos,
                tieneConsentimiento,
                cui,
                codigoTemporal,
                responses: ninoResponses,
                tablaElementId,
                tablasResponses,
            });
        }

        return ninos;
    }

    // ── Crear niño nuevo ──────────────────────────────────────────────
    private async crearNino(
        nino: NinoParsed,
        id_encuesta: number,
        id_comunidad: number | null
    ): Promise<void> {

        const hitosNino = await prisma.hitosNino.create({
            data: {
                // uuid,
                id_encuesta,
                indice: nino.indice,
                nombres: nino.nombres,
                apellidos: nino.apellidos,
                tiene_consentimiento: nino.tieneConsentimiento,
                tabla_element_id: nino.tablaElementId,
                responses: nino.responses,
            }
        });

        await this.upsertPersonaYVincular(nino, hitosNino.id_nino, id_comunidad);
        await this.procesarTablas(hitosNino.id_nino, nino.tablaElementId, nino.tablasResponses);
    }

    // ── Actualizar niño existente ─────────────────────────────────────
    private async actualizarNino(
        nino: NinoParsed,
        id_nino: number,
        id_comunidad: number | null
    ): Promise<void> {
        await prisma.hitosNino.update({
            where: { id_nino },
            data: {
                nombres: nino.nombres,
                apellidos: nino.apellidos,
                tiene_consentimiento: nino.tieneConsentimiento,
                tabla_element_id: nino.tablaElementId,
                responses: nino.responses,
            }
        });

        await this.upsertPersonaYVincular(nino, id_nino, id_comunidad);
        await this.procesarTablas(id_nino, nino.tablaElementId, nino.tablasResponses);
    }

    // ── Crear/actualizar persona y vincular al niño ───────────────────
    private async upsertPersonaYVincular(
        nino: NinoParsed,
        id_nino: number,
        id_comunidad: number | null
    ): Promise<void> {
        if (!nino.nombres && !nino.apellidos) return;

        try {
            const personaResult = await personaService.upsertPersona({
                cui: nino.cui,
                codigoTemporal: nino.codigoTemporal,
                nombres: nino.nombres,
                apellidos: nino.apellidos,
                idComunidad: id_comunidad,
                registroIncompleto: !nino.cui,
            });

            await prisma.hitosNino.update({
                where: { id_nino },
                data: { id_persona: personaResult.id_persona }
            });
        } catch (error) {
            logger.error(`⚠️ Error al crear persona para niño ${id_nino}`, error);
        }
    }

    // ── Procesar tablas ───────────────────────────────────────────────
    private async procesarTablas(
        id_nino: number,
        tablaElementId: string | null,
        tablasResponses: Record<string, string>
    ): Promise<void> {
        if (!tablaElementId || Object.keys(tablasResponses).length === 0) return;

        for (const [key, colId] of Object.entries(tablasResponses)) {
            // key = 'rowId_groupId'
            const lastUnderscore = key.lastIndexOf('_');
            if (lastUnderscore === -1) continue;
            const rowId = key.substring(0, lastUnderscore);
            const groupId = key.substring(lastUnderscore + 1);

            await prisma.hitosTablaRespuesta.upsert({
                where: {
                    id_nino_table_element_id_row_id_group_id: {
                        id_nino,
                        table_element_id: tablaElementId,
                        row_id: rowId,
                        group_id: groupId,
                    }
                },
                create: {
                    id_nino,
                    table_element_id: tablaElementId,
                    row_id: rowId,
                    group_id: groupId,
                    col_id: colId,
                },
                update: { col_id: colId }
            });
        }
    }

    // ── Extraer valor por fieldRole del JSON ──────────────────────────
    private extractByFieldRole(
        ninoResponses: Record<string, any>,
        estructura: any,
        fieldRole: string
    ): string | null {
        const regionPersona = estructura?.regions?.find(
            (r: any) => r.repeatConfig?.enabled === true
        );
        if (!regionPersona) return null;

        const buscarEnChildren = (children: any[]): string | null => {
            for (const child of children) {
                if (child.type === 'region') {
                    const found = buscarEnChildren(child.children || []);
                    if (found) return found;
                } else if (child.fieldRole === fieldRole) {
                    const valor = ninoResponses[child.id];
                    return valor != null ? String(valor) : null;
                }
            }
            return null;
        };

        return buscarEnChildren(regionPersona.children || []);
    }
}

interface NinoParsed {
    indice: number;
    nombres: string;
    apellidos: string;
    tieneConsentimiento: boolean;
    cui: string | null;
    codigoTemporal: string | null;
    responses: Record<string, any>;
    tablaElementId: string | null;
    tablasResponses: Record<string, string>;
}

export const hitosWebService = new HitosWebService();