// src/scripts/test-staging.ts
import { prisma } from "@/config/database";
import { syncProcessingQueue } from "@/queues/sync-processing.queue";

async function crearStagingDePrueba(): Promise<void> {
    // Tomamos el primer centro que exista, solo para la prueba
    const centro = await prisma.centroNutreme.findFirst();

    if (!centro) {
        console.error("❌ No hay ningún CentroNutreme en la base para probar. Crea uno primero.");
        process.exit(1);
    }

    console.log(`📍 Usando centro: ${centro.nombre} (uuid: ${centro.uuid})`);
    console.log(`   Coordenadas actuales: lat=${centro.latitud}, lng=${centro.longitud}`);

    // Creamos la fila de staging, simulando lo que el móvil habría enviado
    const staging = await prisma.syncStaging.create({
        data: {
            tipo: "centros_nutreme",
            payload: {
                uuid: centro.uuid,
                latitud: 14.999999,   // valor de prueba, distinto al actual
                longitud: -90.111111,
            },
            estado: "pendiente",
        },
    });

    console.log(`💾 Staging creado con id: ${staging.id}`);

    // Encolamos el job, como haría el controlador
    const job = await syncProcessingQueue.add("procesar-staging", { stagingId: staging.id });

    console.log(`📨 Job encolado con id: ${job.id}`);
    process.exit(0);
}

crearStagingDePrueba();