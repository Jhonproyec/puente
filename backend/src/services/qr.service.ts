import QRCode from 'qrcode';
import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import path from "path";
import fs from 'fs';

export class QrService {
    private readonly qrFolder = path.join(__dirname, '../../public/qr');
    private readonly qrFolderUsuarios = path.join(__dirname, '../../public/qr/usuarios');

    async getOrCreateQr(id_familia: number): Promise<{ url: string; qr_path: string }> {

        // 1. Buscar la familia
        const familia = await prisma.familia.findUnique({
            where: { id_familia },
            include: {
                madre: {
                    select: { cui: true, nombres: true, apellidos: true }
                }
            }
        });

        if (!familia) throw new Error('Familia no encontrada');

        // 2. Si ya tiene QR y el archivo existe en el servidor, devolver el existente
        if (familia.qr_path) {
            const archivoExiste = fs.existsSync(familia.qr_path);
            if (archivoExiste) {
                const url = this.pathToUrl(familia.qr_path);
                logger.info(`QR existente devuelto: ${url}`);
                return { url, qr_path: familia.qr_path };
            }
        }

        // 3. Generar nuevo QR
        const qrData = JSON.stringify({
            cui: familia.madre.cui,
            codigo_familia: familia.codigo,
            nombres: familia.madre.nombres,
            apellidos: familia.madre.apellidos,
        });

        const nombreArchivo = `familia_${familia.codigo}.png`;
        const rutaCompleta = path.join(this.qrFolder, nombreArchivo);

        // Asegurar que la carpeta existe
        if (!fs.existsSync(this.qrFolder)) {
            fs.mkdirSync(this.qrFolder, { recursive: true });
        }

        // Generar y guardar el QR como imagen PNG
        await QRCode.toFile(rutaCompleta, qrData, {
            type: 'png',
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // 4. Guardar la ruta en base de datos
        await prisma.familia.update({
            where: { id_familia },
            data: { qr_path: rutaCompleta }
        });

        const url = this.pathToUrl(rutaCompleta);
        logger.info(`QR generado y guardado: ${url}`);

        return { url, qr_path: rutaCompleta };
    }

    async generarQrPersona(
        id_persona: number,
        cui: string,
        nombreCompleto: string
    ): Promise<{ url: string; qr_path: string }> {

        const nombreArchivo = `persona_${id_persona}.png`;
        const rutaCompleta = path.join(this.qrFolder, nombreArchivo);

        if (!fs.existsSync(this.qrFolder)) {
            fs.mkdirSync(this.qrFolder, { recursive: true });
        }

        const qrData = JSON.stringify({
            cui,
            nombre: nombreCompleto,
            tipo: 'persona'
        });

        await QRCode.toFile(rutaCompleta, qrData, {
            type: 'png',
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        const url = this.pathToUrl(rutaCompleta);
        return { url, qr_path: rutaCompleta };
    }

    async generarQrUsuario(
        id_usuario: number,
        dpi: string,
        nombreCompleto: string
    ): Promise<{ url: string; qr_path: string }> {

        const nombreArchivo = `usuario_${id_usuario}.png`;
        const rutaCompleta = path.join(this.qrFolderUsuarios, nombreArchivo);

        // 👇 crea la carpeta /public/qr/usuarios/ si no existe
        if (!fs.existsSync(this.qrFolderUsuarios)) {
            fs.mkdirSync(this.qrFolderUsuarios, { recursive: true });
        }

        const qrData = JSON.stringify({
            dpi,
            nombre: nombreCompleto,
            tipo: 'usuario'
        });

        await QRCode.toFile(rutaCompleta, qrData, {
            type: 'png',
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        const url = this.pathToUrlUsers(rutaCompleta);
        return { url, qr_path: rutaCompleta };
    }
    // ============================================
    // CONVERTIR RUTA DEL SERVIDOR A URL PÚBLICA
    // ============================================

    private pathToUrl(rutaCompleta: string): string {
        const nombreArchivo = path.basename(rutaCompleta);
        return `/public/qr/${nombreArchivo}`;
    }

    private pathToUrlUsers(rutaCompleta: string): string {
        const nombreArchivo = path.basename(rutaCompleta);
        return `/public/qr/usuarios/${nombreArchivo}`;
    }

    async generarQrCentroNutreme(
        id_centro: number,
        uuid: string,
        nombre: string
    ): Promise<{ url: string; qr_path: string }> {

        const folder = path.join(__dirname, '../../public/qr/centros_nutreme');
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        const nombreArchivo = `centro_${id_centro}.png`;
        const rutaCompleta = path.join(folder, nombreArchivo);

        const qrData = JSON.stringify({
            uuid,
            nombre,
            tipo: 'centro_nutreme'
        });

        await QRCode.toFile(rutaCompleta, qrData, {
            type: 'png',
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        const url = `/public/qr/centros_nutreme/${nombreArchivo}`;
        return { url, qr_path: rutaCompleta };
    }
}

export const qrService = new QrService();