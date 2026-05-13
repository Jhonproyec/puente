import { syncService } from "@/services/sync.service";
import { Request, Response, NextFunction } from "express";

export class SyncController {
  async initialSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = 3;
      console.log(req.query);
      const data = await syncService.getInitialSyncData(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const syncController = new SyncController();