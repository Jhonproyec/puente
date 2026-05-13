import { syncController } from "@/controllers/syncController";
import { Router } from "express";

const syncRouter = Router();

syncRouter.get('/initial', syncController.initialSync.bind(syncController));

export default syncRouter;