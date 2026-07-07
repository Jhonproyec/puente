import { AuthenticatedRequestInterface } from "@/interface/authInterface";
import { syncService } from "@/services/sync.service";
import {  Response, NextFunction } from "express";

export class SyncController {
  async initialSync(req: AuthenticatedRequestInterface, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = await syncService.getInitialSyncData(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const syncController = new SyncController();