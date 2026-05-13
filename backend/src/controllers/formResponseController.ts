import { Request, Response, NextFunction } from 'express';
import { ApiResponseInterface } from '@/interface/apiResponseInterface';
import { formResponseService } from '@/services/form_responses.service';
import { SaveResponseInput } from '@/interface/formResponseInterface';

export class FormResponseController {

    async saveResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { 
                id_formulario,
                id_usuario,
                responses,
                estructura,
                visibleElements
            } = req.body;

            if (!id_formulario || !responses || !estructura) {
                res.status(400).json({
                    success: false,
                    message: 'id_formulario, responses y estructura son requeridos'
                });
                return;
            }

            const dataSave: SaveResponseInput = {
                id_formulario: id_formulario,
                id_usuario: id_usuario ? Number(id_usuario) : undefined,
                responses,
                estructura,
                visibleElements: visibleElements || []
            };

            const resultado = await formResponseService.saveResponse(dataSave);

            const response: ApiResponseInterface = {
                success: true,
                message: 'Respuesta guardada correctamente',
                data: { id_respuesta: resultado.id_respuesta }
            };

            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getResponses(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_formulario } = req.params;
            const {
                id_comunidad,
                id_departamento,
                fecha_desde,
                fecha_hasta,
                id_usuario,
                page,
                limit
            } = req.query;

            const resultado = await formResponseService.getResponses(
                Number(id_formulario),
                {
                    ...(id_comunidad ? { id_comunidad: Number(id_comunidad) } : {}),
                    ...(id_departamento ? { id_departamento: Number(id_departamento) } : {}),
                    ...(fecha_desde ? { fecha_desde: fecha_desde as string } : {}),
                    ...(fecha_hasta ? { fecha_hasta: fecha_hasta as string } : {}),
                    ...(id_usuario ? { id_usuario: Number(id_usuario) } : {}),
                    page: page ? Number(page) : 1,
                    limit: limit ? Number(limit) : 20,
                }
            );

            const response: ApiResponseInterface = {
                success: true,
                message: 'Respuestas obtenidas correctamente',
                data: resultado
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getFormResponses(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { uuid } = req.params;
            const { id_comunidad, id_departamento, fecha_desde, fecha_hasta, page, limit } = req.query;

            const resultado = await formResponseService.getFormResponses(uuid, {
                ...(id_comunidad ? { id_comunidad: Number(id_comunidad) } : {}),
                ...(id_departamento ? { id_departamento: Number(id_departamento) } : {}),
                ...(fecha_desde ? { fecha_desde: fecha_desde as string } : {}),
                ...(fecha_hasta ? { fecha_hasta: fecha_hasta as string } : {}),
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20,
            });

            res.status(200).json({ success: true, message: 'Respuestas obtenidas', data: resultado });
        } catch (error) {
            next(error);
        }
    }

    async deleteResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_respuesta } = req.params;
            await formResponseService.deleteResponse(Number(id_respuesta));
            res.status(200).json({ success: true, message: 'Respuesta eliminada', data: [] });
        } catch (error) {
            next(error);
        }
    }

    async updateResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_respuesta } = req.params;
            const { datos } = req.body;
            const updated = await formResponseService.updateResponse(Number(id_respuesta), datos);
            res.status(200).json({ success: true, message: 'Respuesta actualizada', data: updated });
        } catch (error) {
            next(error);
        }
    }
    async getPersonaByCui(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { cui } = req.params;

            if (!cui || (cui.length !== 13 && cui.length !== 15)) {
                res.status(400).json({ success: false, message: 'CUI inválido' });
                return;
            }

            const persona = await formResponseService.getPersonaByCui(cui);
            res.status(200).json({
                success: true,
                message: 'Persona encontrada',
                data: persona
            });
        } catch (error) {
            next(error);
        }
    }
}

export const formResponseController = new FormResponseController();