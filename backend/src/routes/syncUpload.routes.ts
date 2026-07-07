import { Router } from "express";
import { syncUploadController } from "@/controllers/syncuploadController";

export const syncUploadRouter = Router();

syncUploadRouter.post('/', syncUploadController.uploadLote);