import { Worker, Job } from "bullmq";
import { bullmqConnectionOptions } from "@/config/redis";
import { COLA_PRUEBA } from "@/queues/cola-prueba.queue";

async function procesarTrabajo(job: Job): Promise<void> {
    console.log(`⚙️  Procesando job ${job.id} con datos:`, job.data);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`✅ Job ${job.id} terminado`);
}

const worker = new Worker(COLA_PRUEBA, procesarTrabajo, {
    connection: bullmqConnectionOptions,
});

worker.on("completed", (job) => {
    console.log(`🎉 Job ${job.id} marcado como completado en BullMQ`);
});

worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} falló:`, err.message);
});

console.log("👂 Worker de prueba escuchando la cola... (Ctrl+C para detener)");