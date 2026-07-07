// src/controllers/centroNutreme.controller.ts
import { ApiResponseInterface } from '@/interface/apiResponseInterface';
import { centroNutremeService } from '@/services/centro_nutreme.service';
import { Request, Response, NextFunction } from 'express';

export class CentroNutremeController {

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { codigo, nombre, id_comunidad, id_usuario, coordenadas } = req.body;

            if (!codigo || !nombre || !id_comunidad) {
                const response: ApiResponseInterface = {
                    success: false,
                    message: 'Código, nombre y comunidad son requeridos',
                    data: []
                };
                res.status(400).json(response);
                return;
            }

            const centro = await centroNutremeService.createCentroNutreme({
                codigo,
                nombre,
                id_comunidad: Number(id_comunidad),
                id_usuario: id_usuario ? Number(id_usuario) : null,
                coordenadas: coordenadas || null,
            });

            res.status(201).json({ success: true, message: 'Centro Nútreme creado', data: centro });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { codigo, nombre, id_comunidad, id_usuario, coordenadas } = req.body;

            const centro = await centroNutremeService.updateCentroNutreme(Number(id), {
                codigo,
                nombre,
                id_comunidad: id_comunidad ? Number(id_comunidad) : undefined,
                id_usuario: id_usuario !== undefined ? Number(id_usuario) : null,
                coordenadas,
            });

            res.status(200).json({ success: true, message: 'Centro Nútreme actualizado', data: centro });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            await centroNutremeService.deleteCentroNutreme(Number(id));
            res.status(200).json({ success: true, message: 'Centro Nútreme eliminado' });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_comunidad, page, limit } = req.query;
            const result = await centroNutremeService.getCentros({
                id_comunidad: id_comunidad ? Number(id_comunidad) : undefined,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20,
            });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const centro = await centroNutremeService.getCentroById(Number(id));
            res.status(200).json({ success: true, data: centro });
        } catch (error) {
            next(error);
        }
    }

    async generarQr(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const result = await centroNutremeService.generarQr(Number(id));
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getEvaluaciones(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, limit, fecha_desde, fecha_hasta } = req.query;
            const resultado = await centroNutremeService.getEvaluaciones({
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20,
                fecha_desde: fecha_desde as string | undefined,
                fecha_hasta: fecha_hasta as string | undefined,
            });
            res.status(200).json({ success: true, data: resultado });
        } catch (error) {
            next(error);
        }
    }
}

export const centroNutremeController = new CentroNutremeController();