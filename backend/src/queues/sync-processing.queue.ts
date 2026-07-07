import { bullmqConnectionOptions } from "@/config/redis";
import { Queue } from "bullmq";

export const SYNC_PROCESSING_QUEUE = "sync-processing";

export interface SyncProcessingJobData {
    stagingId: number;
}


export const syncProcessingQueue = new Queue<SyncProcessingJobData>(SYNC_PROCESSING_QUEUE, {
    connection: bullmqConnectionOptions,
    defaultJobOptions:{
        attempts: 3, 
        backoff: {type: "exponential",delay: 5000},
        removeOnComplete: 500,
        removeOnFail: 1000
    }
});