import { imageCatalogController } from "@/controllers/imageCatalogsController";
import { upload } from "@/middleware/uploadMiddleware";
import { Router } from "express";

export const imagesCatalog = Router();

imagesCatalog.get('/', imageCatalogController.getImages);
imagesCatalog.post('/upload', upload.array('images', 20), imageCatalogController.uploadImages);
imagesCatalog.patch('/:id', imageCatalogController.renameImage);
imagesCatalog.delete('/:id', imageCatalogController.deleteImage);
imagesCatalog.post('/delete-bulk', imageCatalogController.deleteImages);