import { ApiResponseInterface } from "@/interface/apiResponseInterface";
import { familiaService } from "@/services/familia.service";
import { qrService } from "@/services/qr.service";
import { Request, Response, NextFunction } from "express";

export class FamiliaController {
    async getFamilias(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_comunidad, id_departamento, page, limit } = req.query;

            const resultado = await familiaService.getFamilias({
                ...(id_comunidad ? { id_comunidad: Number(id_comunidad) } : {}),
                ...(id_departamento ? { id_departamento: Number(id_departamento) } : {}),
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20,
            });

            const response: ApiResponseInterface = {
                success: true,
                message: 'Familias obtenidas correctamente',
                data: resultado
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getFamiliaById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_familia } = req.params;

            const familia = await familiaService.getFamiliaById(Number(id_familia));

            if (!familia) {
                res.status(404).json({ success: false, message: 'Familia no encontrada' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Familia obtenida correctamente',
                data: familia
            });
        } catch (error) {
            next(error);
        }
    }

    //NUEVO: Obtener o generar QR
    async getQr(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_familia } = req.params;
            const resultado = await qrService.getOrCreateQr(Number(id_familia));

            res.status(200).json({
                success: true,
                message: 'QR obtenido correctamente',
                data: resultado
            });
        } catch (error) {
            next(error);
        }
    }

    async getIntegrantes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_familia } = req.params;
            const integrantes = await familiaService.getIntegrantes(Number(id_familia));

            res.status(200).json({
                success: true,
                message: 'Integrantes obtenidos correctamente',
                data: integrantes
            });
        } catch (error) {
            next(error);
        }
    }

    async generarCodigoTemporal(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { nombres, apellidos, id_comunidad, fecha_inscripcion } = req.body;

            if (!nombres || !apellidos || !id_comunidad || !fecha_inscripcion) {
                res.status(400).json({
                    success: false,
                    message: 'nombres, apellidos, id_comunidad y fecha_inscripcion son requeridos'
                });
                return;
            }

            const codigo = await familiaService.generarCodigoTemporal(
                nombres,
                apellidos,
                Number(id_comunidad),
                fecha_inscripcion
            );

            res.status(200).json({
                success: true,
                message: 'Código generado correctamente',
                data: { codigo }
            });
        } catch (error) {
            next(error);
        }
    }
}

export const familiaController = new FamiliaController();