import { Request, Response, NextFunction } from 'express';
import { ApiResponseInterface } from '@/interface/apiResponseInterface';
import { formResponseService } from '@/services/form_responses.service';
import { SaveResponseInput } from '@/interface/formResponseInterface';
import { carnetService } from '@/services/carnet.service';
import { HITOS_FORM_UUID } from '@/constants/form-regions.constants';
import { hitosWebService } from '@/services/hitosWeb.service';

export class FormResponseController {

    async saveResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_formulario, id_usuario, responses, estructura, visibleElements } = req.body;

            if (!id_formulario || !responses || !estructura) {
                res.status(400).json({ success: false, message: 'id_formulario, responses y estructura son requeridos' });
                return;
            }

            //Detectar si es formulario de hitos
            if (id_formulario === HITOS_FORM_UUID) {
                const resultado = await hitosWebService.procesarDesdeWeb({
                    responses,
                    visibleElements: visibleElements || [],
                    id_usuario: id_usuario ? Number(id_usuario) : null,
                    id_formulario,
                });
                res.status(201).json({ success: true, message: 'Encuesta de hitos guardada', data: resultado });
                return;
            }

            // flujo normal
            const dataSave: SaveResponseInput = {
                id_formulario,
                id_usuario: id_usuario ? Number(id_usuario) : undefined,
                responses,
                estructura,
                visibleElements: visibleElements || []
            };

            const resultado = await formResponseService.saveResponse(dataSave);
            res.status(201).json({ success: true, message: 'Respuesta guardada correctamente', data: { id_respuesta: resultado.id_respuesta } });
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
            const { datos, visibleElements, id_formulario } = req.body; // 👈 agregar id_formulario

            // 👇 Detectar si es hitos
            if (id_formulario === HITOS_FORM_UUID) {
                const resultado = await hitosWebService.actualizarDesdeWeb({
                    id_encuesta: Number(id_respuesta), // id_respuesta = id_encuesta para hitos
                    responses: datos,
                    visibleElements: visibleElements || [],
                });
                res.status(200).json({ success: true, message: 'Encuesta de hitos actualizada', data: resultado });
                return;
            }


            // flujo normal
            const datosConVisible = { ...datos, visibleElements: visibleElements || [] };
            const updated = await formResponseService.updateResponse(Number(id_respuesta), datosConVisible);
            res.status(200).json({ success: true, message: 'Respuesta actualizada', data: updated });
        } catch (error) {
            next(error);
        }
    }
    // async updateResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     try {
    //         const { id_respuesta } = req.params;
    //         const { datos } = req.body;
    //         const updated = await formResponseService.updateResponse(Number(id_respuesta), datos);
    //         res.status(200).json({ success: true, message: 'Respuesta actualizada', data: updated });
    //     } catch (error) {
    //         next(error);
    //     }
    // }
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

    async getResponseById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_respuesta } = req.params;
            const respuesta = await formResponseService.getResponseById(Number(id_respuesta));

            res.status(200).json({
                success: true,
                message: 'Respuesta obtenida correctamente',
                data: respuesta
            });
        } catch (error) {
            next(error);
        }
    }

    async getPersonaByCodigoTemporal(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { codigo } = req.params;

            if (!codigo) {
                res.status(400).json({ success: false, message: 'Código requerido' });
                return;
            }

            const persona = await carnetService.getPersonaByCodigoTemporal(codigo);
            res.status(200).json({
                success: true,
                message: 'Persona encontrada',
                data: persona
            });
        } catch (error) {
            next(error);
        }
    }

    async getCarnetPersonas(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_formulario, id_comunidad, page, limit } = req.query;

            if (!id_formulario) {
                res.status(400).json({ success: false, message: 'id_formulario requerido' });
                return;
            }

            const resultado = await carnetService.getCarnetPersonas({
                id_formulario: Number(id_formulario),
                ...(id_comunidad ? { id_comunidad: Number(id_comunidad) } : {}),
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20,
            });

            res.status(200).json({
                success: true,
                message: 'Personas obtenidas correctamente',
                data: resultado
            });
        } catch (error) {
            next(error);
        }
    }

    async generarQrPersona(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_persona } = req.params;
            const result = await carnetService.generarQrPersonaOnDemand(Number(id_persona));
            res.status(200).json({
                success: true,
                message: 'QR generado',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getEvaluacionesDocentes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, limit, fecha_desde, fecha_hasta } = req.query;
            const resultado = await formResponseService.getEvaluacionesDocentes({
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

export const formResponseController = new FormResponseController();