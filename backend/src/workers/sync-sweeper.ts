import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { syncProcessingQueue } from "@/queues/sync-processing.queue";

const INTERVALO_SEGUNDOS = Number(process.env.SYNC_SWEEPER_INTERVAL_SECONDS) || 1200;

async function barrer(): Promise<void> {
    const umbral = new Date(Date.now() - INTERVALO_SEGUNDOS * 1000);

    // Filas 'pendiente' (nunca se encoló o se perdió el mensaje en Redis)
    // o 'procesando' que llevan demasiado tiempo atascadas (el worker murió a mitad de proceso).
    // No tocamos 'error': esas ya agotaron sus reintentos de BullMQ y requieren revisión manual.
    const atascadas = await prisma.syncStaging.findMany({
        where: {
            estado: { in: ["pendiente", "procesando"] },
            updated_at: { lt: umbral },
        },
        select: { id: true },
    });

    if (atascadas.length === 0) {
        logger.info("Barrendero: nada pendiente por re-encolar");
        return;
    }

    await syncProcessingQueue.addBulk(
        atascadas.map((row) => ({
            name: "procesar-staging",
            data: { stagingId: row.id },
        }))
    );

    logger.warn(`Barrendero: re-encoladas ${atascadas.length} fila(s) atascada(s)`);
}

export function iniciarSweeper(): void {
    logger.info(`Sweeper iniciado — cada ${INTERVALO_SEGUNDOS}s`);
    setInterval(() => {
        barrer().catch((err) => logger.error(`❌ Error en sweeper: ${err.message}`));
    }, INTERVALO_SEGUNDOS * 1000);
}