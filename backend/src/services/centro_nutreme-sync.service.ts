// src/services/centro-nutreme-sync.service.ts
import { prisma } from "@/config/database";
import { logger } from "@/config/logger";

interface CentroNutremeSync {
    uuid: string;
    latitud: number;
    longitud: number;
}

interface ResultadoCentroSync {
    uuid: string;
    success: boolean;
    error?: string;
}

export class CentroNutremeSyncService {

    async procesarCentros(centros: CentroNutremeSync[]): Promise<ResultadoCentroSync[]> {
        const resultados: ResultadoCentroSync[] = [];

        for (const centro of centros) {
            try {
                await prisma.centroNutreme.update({
                    where: { uuid: centro.uuid },
                    data: {
                        latitud: centro.latitud,
                        longitud: centro.longitud,
                    },
                });

                resultados.push({ uuid: centro.uuid, success: true });
                logger.info(`✅ Centro Nutreme sincronizado: ${centro.uuid}`);
            } catch (error: any) {
                logger.error(`❌ Error sincronizando centro ${centro.uuid}`, error);
                resultados.push({
                    uuid: centro.uuid,
                    success: false,
                    error: error.message || 'Error desconocido',
                });
            }
        }

        return resultados;
    }
}

export const centroNutremeSyncService = new CentroNutremeSyncService();