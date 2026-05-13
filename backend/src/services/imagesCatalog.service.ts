import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { CatalogImagesInterface, PaginatedResponse } from "@/interface/catalogImagesInterface";
import { ConflictError } from "@/utils/appError";
import { OptimizeAndSave } from "@/utils/optimize.service";
import path from "path";
import fs from "fs";

export class ImagesCatalogService {
    async getImages(page: number, limit: number, search: string, skip: number): Promise<PaginatedResponse<CatalogImagesInterface>> {
        try {
            const where = {
                estado_registro: true,
                ...(search && {
                    nombre: { contains: search, mode: 'insensitive' as const }
                }),
            };

            const [total, images] = await Promise.all([
                prisma.catalogoImagenes.count({ where }),
                prisma.catalogoImagenes.findMany({
                    where,
                    orderBy: { fecha_registro: 'desc' },
                    skip,
                    take: limit,
                    select: {
                        id_catalogo_imagen: true,
                        nombre: true,
                        nombre_archivo: true,
                        ruta: true,
                        size: true,
                        mime_type: true,
                        fecha_registro: true,
                    }
                })
            ]);

            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

            return {
                data: images.map(img => ({
                    id_catalogo_imagen: img.id_catalogo_imagen,
                    name: img.nombre,
                    file_name: img.nombre_archivo,
                    path: `${baseUrl}/${img.ruta}`,
                    size: img.size,
                    mime_type: img.mime_type,
                    created_at: img.fecha_registro,
                })),
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                }
            };

        } catch (error) {
            logger.error("Error al obtener las imágenes", error);
            throw error;
        }
    }


    async uploadImages(files: Express.Multer.File[], nombres: string[]): Promise<any> {
        try {
            const saved = await Promise.all(
                files.map(async (file, i) => {
                    // Optimizar con Sharp
                    const processed = await OptimizeAndSave(file.buffer, file.originalname);

                    // Guardar en BD
                    return prisma.catalogoImagenes.create({
                        data: {
                            nombre: nombres[i] || processed.filename,
                            nombre_archivo: processed.filename,
                            ruta: processed.ruta,
                            size: processed.size,
                            mime_type: processed.mime_type,
                        }
                    });
                })
            );

            return {
                success: true,
                count: saved.length,
                message: `${saved.length} imagen(es) subida(s) exitosamente`,
            };

        } catch (error) {
            logger.error('Error al subir imágenes', error);
            throw error;
        }
    }

    async renameImage(id: number, name: string): Promise<any> {
        try {
            const exist = await prisma.catalogoImagenes.findFirst({
                where: { id_catalogo_imagen: id, estado_registro: true },
            });
            if (!exist) {
                throw new ConflictError("La imágen no existe");
            }
            const response = await prisma.catalogoImagenes.update({
                where: { id_catalogo_imagen: id, estado_registro: true },
                data: { nombre: name },
            });
            return response;
        } catch (error) {
            logger.error('Error al cambiar el nombre de la imagen', error);
            throw error;
        }
    }

    async deleteImage(id: number): Promise<any> {
        try {
            const exist = await prisma.catalogoImagenes.findFirst({
                where: { id_catalogo_imagen: id }
            });

            if (!exist) {
                throw new ConflictError("La imágen no existe");
            }
            await prisma.catalogoImagenes.delete({
                where: { id_catalogo_imagen: id }
            });

            const filepath = path.join(process.cwd(), exist.ruta);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath)
            }

        } catch (error) {
            logger.error('Error al eliminar la imagen', error);
            throw error;
        }
    }

    async deleteImages(ids: Array<number>): Promise<void> {
        try {
            const images = await prisma.catalogoImagenes.findMany({
                where: { id_catalogo_imagen: { in: ids }, estado_registro: true },
                select: { id_catalogo_imagen: true, ruta: true },
            });

            if (images.length == 0) {
                throw new ConflictError("Imágenes no encontradas");
            }

            await prisma.catalogoImagenes.deleteMany({
                where: { id_catalogo_imagen: { in: images.map(i => i.id_catalogo_imagen) } },
            });

            images.forEach(img => {
                const filepath = path.join(process.cwd(), img.ruta);
                if (fs.existsSync(filepath)) {
                    try { fs.unlinkSync(filepath); } catch { /* ignorar si ya no existe */ }
                }
            });
        } catch (error) {
            logger.error('Error al eliminar las imágenes', error);
            throw error;
        }
    }
}
export const imagesCatalogService = new ImagesCatalogService();

