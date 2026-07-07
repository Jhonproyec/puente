import { UPLOAD_DIR } from "@/middleware/uploadMiddleware";
import path from "path";
import sharp from "sharp";
import fs from "fs";

export interface ProcessedImage {
    filename: string;
    ruta:     string;
    size:     number;
    mime_type: string;
}

interface OptimizeOptions {
    maxWidth?:  number;
    maxHeight?: number;
    quality?:   number;
    subFolder?: string; // ✅ nuevo
}

export async function OptimizeAndSave(
    buffer: Buffer,
    originalName: string,
    options: OptimizeOptions = {},
): Promise<ProcessedImage> {

    const {
        maxWidth  = 1920,
        maxHeight = 1920,
        quality   = 82,
        subFolder = '',  // ✅ por defecto vacío — comportamiento anterior
    } = options;

    // ✅ Construir directorio destino
    const targetDir = subFolder
        ? path.join(UPLOAD_DIR, subFolder)
        : UPLOAD_DIR;

    // ✅ Crear subdirectorio si no existe
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const hash     = crypto.randomUUID().toString();
    const filename = `${hash}.webp`;
    const filepath = path.join(targetDir, filename);

    const metadata   = await sharp(buffer).metadata();
    const needsResize =
        (metadata.width  && metadata.width  > maxWidth)  ||
        (metadata.height && metadata.height > maxHeight);

    let pipeline = sharp(buffer).rotate().withMetadata();

    if (needsResize) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
            fit:              'inside',
            withoutEnlargement: true,
        });
    }

    const outputBuffer = await pipeline
        .webp({ quality, effort: 4 })
        .toBuffer();

    await sharp(outputBuffer).toFile(filepath);

    const originalKB  = (buffer.byteLength  / 1024).toFixed(1);
    const optimizedKB = (outputBuffer.byteLength / 1024).toFixed(1);
    const saving      = (((buffer.byteLength - outputBuffer.byteLength) / buffer.byteLength) * 100).toFixed(1);
    console.log(`📸 ${originalName}: ${originalKB}KB → ${optimizedKB}KB (${saving}% ahorro)`);

    // ✅ Ruta relativa incluyendo el subFolder
    const rutaRelativa = subFolder
        ? `uploads/images/${subFolder}/${filename}`
        : `uploads/images/${filename}`;

    return {
        filename,
        ruta:      rutaRelativa,
        size:      outputBuffer.byteLength,
        mime_type: 'image/webp',
    };
}