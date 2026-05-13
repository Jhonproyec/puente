import { catalogController } from "@/controllers/catalogsController";
import { Router } from "express";

export const catalogRouter = Router();

catalogRouter.get('/all', catalogController.getAllCatalogs);
catalogRouter.get('/byId', catalogController.getCatalogById);
catalogRouter.post('/create', catalogController.createCatalog);
catalogRouter.put('/update', catalogController.updateCatalog);
catalogRouter.post('/delete', catalogController.deleteCatalog);
// ITEM DE LOS CATALOGOS
catalogRouter.post('/createItem', catalogController.createCatalogItem);
catalogRouter.put('/updateItem', catalogController.updateCatalogItem);
catalogRouter.delete('/deleteItem', catalogController.deleteCatalogItem);
catalogRouter.get('/departamentos', catalogController.getDepartamento);
catalogRouter.post('/comunidades', catalogController.getComunidades);

catalogRouter.get('/:id/items', catalogController.getCatalogItems);
catalogRouter.get('/:id/metadata', catalogController.getCatalogMetadata);