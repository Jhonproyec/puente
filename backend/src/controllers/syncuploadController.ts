// sync-upload.controller.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/database";
import { syncProcessingQueue } from "@/queues/sync-processing.queue";

function extraerUuid(item: any): string {
    return item.uuid_boleta ?? item.uuid ?? "desconocido";
}

export class SyncUploadController {

    async uploadLote(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { boletas, tipo } = req.body;

            if (!Array.isArray(boletas) || boletas.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Se requiere un array de boletas',
                });
                return;
            }

            if (boletas.length > 20) {
                res.status(400).json({
                    success: false,
                    message: 'Máximo 20 boletas por lote',
                });
                return;
            }

            const tipoFinal = tipo || "boletas";

            // Guardamos cada item como su propia fila de staging.
            // Si algo falla aquí, no respondemos success — el móvil conserva su copia local.
            const stagingRows = await prisma.$transaction(
                boletas.map((item: any) =>
                    prisma.syncStaging.create({
                        data: {
                            tipo: tipoFinal,
                            payload: item,
                            estado: "pendiente",
                        },
                    })
                )
            );

            // Encolamos un job por cada fila
            await syncProcessingQueue.addBulk(
                stagingRows.map((row) => ({
                    name: "procesar-staging",
                    data: { stagingId: row.id },
                }))
            );

            // Respondemos de inmediato: "guardado"
            const resultados = boletas.map((item: any) => ({
                uuid_boleta: extraerUuid(item),
                success: true,
            }));

            res.status(200).json({
                success: true,
                message: `${resultados.length} registro(s) recibidos y guardados. Se procesarán en segundo plano.`,
                data: resultados,
            });

        } catch (error) {
            next(error);
        }
    }
}

export const syncUploadController = new SyncUploadController();