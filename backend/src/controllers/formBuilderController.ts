import { ApiResponseInterface } from "@/interface/apiResponseInterface";
import { CreateFormInterface } from "@/interface/formBuilderInterface";
import { formBuilderService } from "@/services/form_builder.service";
import { Request, Response, NextFunction } from "express";

class FormBuilderController {

    async createForm(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { nombre, usuario_registro, estado } = req.body;
            const data: CreateFormInterface = {
                name: nombre,
                created_user: usuario_registro,
                status: estado
            }
            const result = await formBuilderService.createForm(data);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Formulario Creado Correctamente',
                data: result
            };
            res.status(200).json(response);
        } catch (error) {
            next(error)
        }
    }

    async getMyForms(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_usuario } = req.query;
            const forms = await formBuilderService.getMyForms(Number(id_usuario));
            const response: ApiResponseInterface = {
                success: true,
                message: 'Formularios cargados correctamente',
                data: forms
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getAllForms(_: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const forms = await formBuilderService.getAllForms();
            const response: ApiResponseInterface = {
                success: true,
                message: 'Formularios cargados correctamentes',
                data: forms
            }
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async updateNameForm(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { uuid, nombre, id_usuario } = req.body;
            const form = await formBuilderService.updateNameForm({ name: nombre, uuid, id_usuario: Number(id_usuario) });
            const response: ApiResponseInterface = {
                success: true,
                message: "Nombre actualizado",
                data: form
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async deleteForm(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { uuid, id_usuario } = req.query;
            await formBuilderService.deleteForm(uuid!.toString(), Number(id_usuario));
            const response: ApiResponseInterface = {
                success: true,
                message: "Formulario eliminado correctamente",
                data: []
            }
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async saveJsonform(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { uuid, jsonForm, estado, idUser } = req.body;
            const form = await formBuilderService.saveJsonform(uuid, jsonForm, estado, idUser);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Estructura de formulario guardada',
                data: form
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getFormByUuid(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { uuid } = req.query;

            if (typeof uuid !== 'string') {
                throw new Error('UUID inválido');
            }

            const form = await formBuilderService.getFormByUuid(uuid);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Formulario cargado correctamente',
                data: form
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getFormInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { uuid } = req.params;
            const data = await formBuilderService.getFormInfo(uuid);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Información del formulario',
                data
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }


    async getFormPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { uuid } = req.params;
            const data = await formBuilderService.getFormPreview(uuid);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Vista previa generada',
                data
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

}

export const formBuilderController = new FormBuilderController();