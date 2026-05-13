import { UPLOAD_DIR } from "@/middleware/uploadMiddleware";
import path from "path";
import sharp from "sharp";

export interface ProcessedImage {
    filename: string;   // nombre físico en disco: abc123.webp
    ruta: string;       // ruta relativa: uploads/images/abc123.webp
    size: number;       // bytes del archivo optimizado
    mime_type: string;  // siempre image/webp
}

interface OptimizeOptions {
    maxWidth?: number;   // default: 1920
    maxHeight?: number;  // default: 1920
    quality?: number;    // default: 82  (0-100)
}

export async function OptimizeAndSave(
    buffer: Buffer,
    originalName: string,
    options: OptimizeOptions = {},
): Promise<ProcessedImage> {


    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 82,
    } = options;

    const hash = crypto.randomUUID().toString();
    const filename = `${hash}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const metadata = await sharp(buffer).metadata();
    const needsResize =
        (metadata.width && metadata.width > maxWidth) ||
        (metadata.height && metadata.height > maxHeight);

    let pipeline = sharp(buffer).rotate().withMetadata();

    if (needsResize) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
            fit: 'inside',        // mantiene aspecto, no recorta
            withoutEnlargement: true,
        });
    }

    const outputBuffer = await pipeline
        .webp({ quality, effort: 4 })  // effort 4: buen balance velocidad/compresión
        .toBuffer();


    await sharp(outputBuffer).toFile(filepath);
    // ── Log de compresión ─────────────────────────────────────────
    const originalKB = (buffer.byteLength / 1024).toFixed(1);
    const optimizedKB = (outputBuffer.byteLength / 1024).toFixed(1);
    const saving = (((buffer.byteLength - outputBuffer.byteLength) / buffer.byteLength) * 100).toFixed(1);
    console.log(`📸 ${originalName}: ${originalKB}KB → ${optimizedKB}KB (${saving}% ahorro)`);

    return {
        filename,
        ruta: `uploads/images/${filename}`,
        size: outputBuffer.byteLength,
        mime_type: 'image/webp',
    };

}