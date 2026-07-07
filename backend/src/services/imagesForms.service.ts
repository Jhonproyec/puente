import { logger } from '@/config/logger';
import { OptimizeAndSave } from '@/utils/optimize.service';

export class ImageService {

    isBase64Image(value: any): boolean {
        return typeof value === 'string' &&
               value.startsWith('data:image/');
    }

    private base64ToBuffer(base64: string): Buffer {
        const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) throw new Error('Formato base64 inválido');
        return Buffer.from(matches[2], 'base64');
    }

    async processImages(
        datos: Record<string, any>,
        id_respuesta: number
    ): Promise<Record<string, any>> {
        const processed = { ...datos };

        for (const [key, value] of Object.entries(processed)) {
            if (this.isBase64Image(value)) {
                try {
                    const buffer = this.base64ToBuffer(value);

                    // ✅ Guardar en subdirectorio específico para respuestas
                    const result = await OptimizeAndSave(
                        buffer,
                        `resp_${id_respuesta}_${key}`,
                        {
                            maxWidth:  1280,
                            maxHeight: 1280,
                            quality:   75,
                            subFolder: 'form_response_img' // ✅ nuevo parámetro
                        }
                    );

                    processed[key] = `/${result.ruta}`;
                    logger.info(`✅ Imagen guardada: /${result.ruta}`);

                } catch (error) {
                    logger.error(`❌ Error guardando imagen ${key}`, error);
                    delete processed[key];
                }
            }
        }

        return processed;
    }
}

export const imageService = new ImageService();