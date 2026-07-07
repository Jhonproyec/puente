import { logger } from "@/config/logger";
import { formResponseService } from "./form_responses.service";
import { prisma } from "@/config/database";
// import { hitosSyncService } from "./hitos-sync.service";


interface BimestreSync {
    mes: number;
    bimestre: number;
    huellas: any[];
}
interface BoletaSync {
    uuid_boleta: string;
    id_formulario: string;   // UUID del formulario
    responses: Record<string, any>;
    visibleElements: string[];
    id_usuario?: number | null;
    bimestres?: BimestreSync[];
    id_respuesta_servidor?: number | null;
}

interface ResultadoBoleta {
    uuid_boleta: string;
    success: boolean;
    id_respuesta?: number;
    error?: string;

}

export class SyncUploadService {

    // ============================================
    // PROCESAR UN LOTE DE BOLETAS
    // ============================================

    async procesarLote(boletas: BoletaSync[]): Promise<ResultadoBoleta[]> {
        const resultados: ResultadoBoleta[] = [];

        for (const boleta of boletas) {
            try {
                let id_respuesta: number;

                if (boleta.id_respuesta_servidor) {
                    // ✅ Ya existía en el servidor — actualizar en vez de crear
                    const datosConVisible = {
                        ...boleta.responses,
                        visibleElements: boleta.visibleElements,
                    };
                    const actualizada = await formResponseService.updateResponse(
                        boleta.id_respuesta_servidor,
                        datosConVisible
                    );
                    id_respuesta = actualizada.id_respuesta;
                    logger.info(`♻️ Boleta actualizada (ya existía): ${boleta.uuid_boleta} → respuesta ${id_respuesta}`);
                } else {
                    // ✅ Boleta nueva — crear como siempre
                    const respuesta = await formResponseService.saveResponse({
                        id_formulario: boleta.id_formulario,
                        id_usuario: boleta.id_usuario || null,
                        responses: boleta.responses,
                        visibleElements: boleta.visibleElements,
                    });
                    id_respuesta = respuesta.id_respuesta;
                    logger.info(`✅ Boleta sincronizada (nueva): ${boleta.uuid_boleta} → respuesta ${id_respuesta}`);
                }

                if (boleta.bimestres && boleta.bimestres.length > 0) {
                    await this.sincronizarBimestres(id_respuesta, boleta.bimestres);
                }

                resultados.push({
                    uuid_boleta: boleta.uuid_boleta,
                    success: true,
                    id_respuesta,
                });

            } catch (error: any) {
                logger.error(`❌ Error sincronizando boleta ${boleta.uuid_boleta}`, error);
                resultados.push({
                    uuid_boleta: boleta.uuid_boleta,
                    success: false,
                    error: error.message || 'Error desconocido',
                });
            }
        }

        return resultados;
    }

    private async sincronizarBimestres(
        id_respuesta: number,
        bimestres: BimestreSync[]
    ): Promise<void> {
        for (const b of bimestres) {
            const existente = await prisma.carnetBimestre.findUnique({
                where: { id_respuesta_mes: { id_respuesta, mes: b.mes } }
            });

            if (existente) {
                // ✅ Fusionar huellas — conservar las que ya había, agregar solo las nuevas
                const huellasExistentes = (existente.huellas as any[]) || [];
                const huellasFusionadas = this.mergeHuellas(huellasExistentes, b.huellas);

                await prisma.carnetBimestre.update({
                    where: { id_respuesta_mes: { id_respuesta, mes: b.mes } },
                    data: { huellas: huellasFusionadas, bimestre: b.bimestre }
                });
                continue;
            }

            const respuestaPersona = await prisma.formularioRespuestaPersona.findFirst({
                where: { id_respuesta },
                select: { id_persona: true }
            });

            if (!respuestaPersona) {
                logger.warn(`⚠️ No se encontró persona para respuesta ${id_respuesta}, bimestre ${b.mes}`);
                continue;
            }

            await prisma.carnetBimestre.create({
                data: {
                    id_respuesta,
                    id_persona: respuestaPersona.id_persona,
                    mes: b.mes,
                    bimestre: b.bimestre,
                    huellas: b.huellas,
                }
            });
        }

        logger.info(`✅ ${bimestres.length} bimestre(s) sincronizados para respuesta ${id_respuesta}`);
    }

    private mergeHuellas(existentes: any[], nuevas: any[]): any[] {
        const clave = (h: any) => `${h.fecha}||${h.sesion}`;
        const yaExisten = new Set(existentes.map(clave));

        const resultado = [...existentes];
        for (const h of nuevas) {
            if (!yaExisten.has(clave(h))) {
                resultado.push(h);
                yaExisten.add(clave(h));
            }
        }
        return resultado;
    }
}

export const syncUploadService = new SyncUploadService();