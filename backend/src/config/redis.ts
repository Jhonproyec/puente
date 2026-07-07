import IORedis from "ioredis";

// Instancia para uso directo (scripts propios, no BullMQ)
export const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => {
    console.log("Conectado a Redis");
});

redisConnection.on("error", (err) => {
    console.error("Error de conexión a Redis:", err.message);
});

// Opciones planas para BullMQ — evita mezclar dos copias distintas de ioredis
// (la tuya y la que bullmq trae internamente), que TypeScript no considera compatibles.
export const bullmqConnectionOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null as null,
};