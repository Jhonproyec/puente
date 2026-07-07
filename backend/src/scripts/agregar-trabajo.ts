import { colaPrueba } from "@/queues/cola-prueba.queue";

async function agregarTrabajo(): Promise<void> {
    const job = await colaPrueba.add("saludo", { mensaje: "Hola desde el disparador" });
    console.log(`📨 Job agregado a la cola con id: ${job.id}`);
    process.exit(0);
}

agregarTrabajo();