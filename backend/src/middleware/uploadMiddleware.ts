import path from "path";
import fs from 'fs';
import multer from "multer";

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'images');

if(!fs.existsSync(UPLOAD_DIR)){
    fs.mkdirSync(UPLOAD_DIR, {recursive: true})
}

const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if(allowed.includes(file.mimetype)){
        cb(null, true);
    }else{
        cb(new Error(`Tipo de archivo no permitido ${file.mimetype}`));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10*1024*1024, //10 mb maximio
        files: 20
    },
});

export { UPLOAD_DIR };