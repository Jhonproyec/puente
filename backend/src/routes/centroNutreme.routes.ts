import { centroNutremeController } from '@/controllers/centroNutremeController';
import { Router } from 'express';

export const centroNutremeRouter = Router();

centroNutremeRouter.get('/evaluaciones', centroNutremeController.getEvaluaciones);
centroNutremeRouter.get('/', centroNutremeController.getAll);
centroNutremeRouter.get('/:id', centroNutremeController.getById);
centroNutremeRouter.post('/', centroNutremeController.create);
centroNutremeRouter.put('/:id', centroNutremeController.update);
centroNutremeRouter.delete('/:id', centroNutremeController.delete);
centroNutremeRouter.post('/:id/qr', centroNutremeController.generarQr);