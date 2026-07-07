import { Request, Response, NextFunction } from "express";
import { hitosQueryService } from "@/services/hitos-query.service";

export class HitosController {
    async getEncuestas(req: Request, res: Response, next: NextFunction) {
        try {
            const filtros: {
                id_comunidad?: number;
                id_usuario?: number;
                fecha_desde?: string;
                fecha_hasta?: string;
                page?: number;
                limit?: number;
            } = {
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 20,
            };

            if (req.query.id_comunidad) filtros.id_comunidad = Number(req.query.id_comunidad);
            if (req.query.id_usuario) filtros.id_usuario = Number(req.query.id_usuario);
            if (req.query.fecha_desde) filtros.fecha_desde = req.query.fecha_desde as string;
            if (req.query.fecha_hasta) filtros.fecha_hasta = req.query.fecha_hasta as string;

            const resultado = await hitosQueryService.getEncuestas(filtros);
            res.status(200).json({ success: true, ...resultado });
        } catch (error) {
            next(error);
        }
    }

    async getEncuestaDetalle(req: Request, res: Response, next: NextFunction) {
        try {
            const id_encuesta = Number(req.params.id);
            const encuesta = await hitosQueryService.getEncuestaDetalle(id_encuesta);

            if (!encuesta) {
                res.status(404).json({ success: false, message: 'Encuesta no encontrada' });
                return;
            }

            res.status(200).json({ success: true, data: encuesta });
        } catch (error) {
            next(error);
        }
    }

    async getEstadisticas(req: Request, res: Response, next: NextFunction) {
        try {
            const filtros: {
                id_comunidad?: number;
                fecha_desde?: string;
                fecha_hasta?: string;
            } = {};

            if (req.query.id_comunidad) filtros.id_comunidad = Number(req.query.id_comunidad);
            if (req.query.fecha_desde) filtros.fecha_desde = req.query.fecha_desde as string;
            if (req.query.fecha_hasta) filtros.fecha_hasta = req.query.fecha_hasta as string;

            const estadisticas = await hitosQueryService.getEstadisticas(filtros);
            res.status(200).json({ success: true, data: estadisticas });
        } catch (error) {
            next(error);
        }
    }

    async getEncuestaResponses(req: Request, res: Response, next: NextFunction) {
        try {
            const id_encuesta = Number(req.params.id);
            const responses = await hitosQueryService.getEncuestaComoResponses(id_encuesta);
            res.json({ success: true, data: responses });
        } catch (error) {
            next(error);
        }
    }
}

export const hitosController = new HitosController();