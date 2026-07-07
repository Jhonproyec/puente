import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { bullmqConnectionOptions } from "@/config/redis";
import { SYNC_PROCESSING_QUEUE, SyncProcessingJobData } from "@/queues/sync-processing.queue";
import { centroNutremeSyncService } from "@/services/centro_nutreme-sync.service";
import { hitosSyncService } from "@/services/hitos-sync.service";
import { syncUploadService } from "@/services/sync-upload.service";
import { Job, Worker } from "bullmq";
import { iniciarSweeper } from "./sync-sweeper";


async function procesarStagingRow(job: Job<SyncProcessingJobData>): Promise<void> {
    const { stagingId } = job.data;
    const row = await prisma.syncStaging.findUnique({ where: { id: stagingId } });
    if (!row) {
        logger.warn(`Staging row no encontrada ${stagingId}`);
        return;
    }

    if (row?.estado === "completado") {
        logger.info(`Staging ${stagingId} Completado`);
        return;
    }

    await prisma.syncStaging.update({
        where: { id: stagingId },
        data: { estado: 'procesando', intentos: { increment: 1 } },
    });

    try {
        const payload = row.payload as any;
        let resultado: { success: boolean; error?: string };
        if (row.tipo === "hitos") {
            const [r] = await hitosSyncService.procesarEncuestas([payload]);
            resultado = { success: r.success, error: r.error };
        }
        else if (row.tipo === "centros_nutreme") {
            const [r] = await centroNutremeSyncService.procesarCentros([payload]);
            resultado = { success: r.success, error: r.error };
        } else {
            const [r] = await syncUploadService.procesarLote([payload]);
            resultado = { success: r.success, error: r.error };
        }

        if (!resultado.success) {
            throw new Error(resultado.error || "Error desconocido al procesar");
        }
        await prisma.syncStaging.update({
            where: { id: stagingId },
            data: { estado: "completado", processed_at: new Date(), error_mensaje: null },
        });

        logger.info(`Staging ${stagingId} (${row.tipo}) procesado correctamente`);

    } catch (error: any) {
        await prisma.syncStaging.update({
            where: { id: stagingId },
            data: { estado: "error", error_mensaje: String(error.message).slice(0, 500) },
        });
        logger.error(`Staging ${stagingId} (${row.tipo}) falló: ${error.message}`);
        throw error;
    }
}

export const syncProcessingWorker = new Worker(SYNC_PROCESSING_QUEUE, procesarStagingRow, {
    connection: bullmqConnectionOptions,
    concurrency: Number(process.env.SYNC_WORKER_CONCURRENCY) || 3,
});

syncProcessingWorker.on("completed", (job) => {
    logger.info(`Job ${job.id} completado`);
});

syncProcessingWorker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} falló definitivamente: ${err.message}`);
});
console.log("Worker de sincronización escuchando...");
iniciarSweeper();
console.log("Sync worker  + sweeper corriendo...");

