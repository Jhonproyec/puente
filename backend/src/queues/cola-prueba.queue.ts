import { Queue } from "bullmq";
import { bullmqConnectionOptions } from "@/config/redis";
 
export const COLA_PRUEBA = "cola-prueba";
 
export const colaPrueba = new Queue(COLA_PRUEBA, {
    connection: bullmqConnectionOptions,

});