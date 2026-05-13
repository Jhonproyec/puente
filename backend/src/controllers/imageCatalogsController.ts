import { ApiResponseInterface } from "@/interface/apiResponseInterface";
import { imagesCatalogService } from "@/services/imagesCatalog.service";
import { Request, Response, NextFunction } from "express";

export class ImageCatalogsController {
    async getImages(req: Request, res: Response, next: NextFunction) {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(48, parseInt(req.query.limit as string) || 12);
            const search = (req.query.search as string)?.trim() || '';
            const skip = (page - 1) * limit;

            const images = await imagesCatalogService.getImages(page, limit, search, skip);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Imagenes cargadas correctamente',
                data: images
            }

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }

    }

    async uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                res.status(400).json({ message: 'No se recibieron imágenes' });
                return;
            }

            const nombres = files.map((file, i) => {
                const bodyNombres = req.body.nombres;
                const nombre = Array.isArray(bodyNombres)
                    ? bodyNombres[i]           // múltiples imágenes → array
                    : bodyNombres;             // una sola imagen → string directo

                return (nombre || file.originalname.replace(/\.[^.]+$/, '')).trim();
            });
            const response = await imagesCatalogService.uploadImages(files, nombres);
            res.status(201).json(response);

        } catch (error) {
            next(error);
        }
    }

    async renameImage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const nombre = req.body.nombre?.trim();

            if (!nombre) {
                res.status(400).json({
                    success: false,
                    message: "El nombre es requerido"
                });
            }

            const result = await imagesCatalogService.renameImage(id, nombre);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Catálogo actualizado',
                data: result
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: "El id es requerido"
                });
            }
            await imagesCatalogService.deleteImage(id);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Imagen eliminada',
                data: []
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async deleteImages(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const ids: number[] = req.body.ids;
            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({
                    success: false,
                    message: "Se requiere array de ids"
                });
            }
            await imagesCatalogService.deleteImages(ids);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Imagen eliminada',
                data: []
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
}

export const imageCatalogController = new ImageCatalogsController();