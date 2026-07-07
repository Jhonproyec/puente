import { familiaController } from "@/controllers/familiaController";
import { Router } from "express";

export const familiaRouter = Router();
familiaRouter.get('/',                      familiaController.getFamilias);
familiaRouter.get('/:id_familia',           familiaController.getFamiliaById);
familiaRouter.get('/:id_familia/qr',        familiaController.getQr);
familiaRouter.get('/:id_familia/integrantes', familiaController.getIntegrantes);
familiaRouter.post('/generar-codigo', familiaController.generarCodigoTemporal);