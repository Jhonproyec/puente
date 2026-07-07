import { syncController } from "@/controllers/syncController";
import { authenticateToken } from "@/middleware/authMiddleware";
import { Router } from "express";

const syncRouter = Router();

syncRouter.get('/initial', authenticateToken, syncController.initialSync.bind(syncController));

export default syncRouter;