import { hitosController } from "@/controllers/hitosController";
import { Router } from "express";


const router = Router();


router.get('/', hitosController.getEncuestas);
router.get('/estadisticas', hitosController.getEstadisticas);
router.get('/:id', hitosController.getEncuestaDetalle);
router.get('/:id/responses', hitosController.getEncuestaResponses);


export default router;