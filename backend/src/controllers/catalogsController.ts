import { ApiResponseInterface } from "@/interface/apiResponseInterface";
import { catalogService } from "@/services/catalog.service";
import { Request, Response, NextFunction } from "express";

export class CatalogController {


    async getAllCatalogs(_: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const catalogs = await catalogService.getAllCatalogs();
            res.status(200).json({
                success: true,
                message: 'Catálogos completos',
                data: catalogs
            });
        } catch (error) {
            next(error);
        }
    }

    async getCatalogById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_catalog } = req.query;
            const response = await catalogService.getCatalogById(Number(id_catalog));
            res.status(200).json({
                success: true,
                message: `Catálogo ${response?.nombre}`,
                data: response
            })
        } catch (error) {
            next(error);
        }
    }

    async createCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { nombre } = req.body;
            // TODO CREAR MIDDLEWARE DE VALIDACIÓN
            if (!nombre) {
                res.status(400).json({
                    success: false,
                    message: "Codigo y nombre son requerido"
                })
            };

            const catalog = await catalogService.createCatalog({ nombre });
            const response: ApiResponseInterface = {
                success: true,
                message: 'Catalogo creado correctamente',
                data: catalog
            }
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async updateCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id_catalogo } = req.query;
            const { nombre } = req.body;

            if (!id_catalogo || !nombre) {
                res.status(400).json({
                    success: false,
                    message: "Debe ingresar el id, codigo y nombre para editar el catálogo"
                });
            }

            const catalog = await catalogService.updateCatalog({ id_catalogo: Number(id_catalogo), nombre });
            const response: ApiResponseInterface = {
                success: true,
                message: 'Catálogo actualizado',
                data: catalog
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async deleteCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { ids } = req.body;
            await catalogService.deleteCatalogs(ids);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Catálogo eliminado',
                data: []
            }
            res.status(200).json(response);

        } catch (error) {
            next(error);
        }
    }

    async createCatalogItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { nombre, id_catalogo, filterValue } = req.body;

            if (!nombre || !id_catalogo) {
                res.status(400).json({ success: false, message: 'nombre e id_catalogo son requeridos' });
                return;
            }

            const item = await catalogService.createCatalogItem({
                nombre: nombre.trim(),
                id_catalog: Number(id_catalogo),
                filterValue: filterValue ? Number(filterValue) : null
            });
            const response: ApiResponseInterface = {
                success: true,
                message: 'Item creado correctamente',
                data: item
            }

            res.status(201).json(response);
        } catch (error: any) {
            next(error);
        }
    }

    async updateCatalogItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id_catalog_item = Number(req.query['id_catalog_item']);
            const { nombre, id_catalog, filterValue } = req.body;  // 👈 recibir id_catalog

            if (!nombre || !id_catalog_item || !id_catalog) {
                res.status(400).json({ success: false, message: 'nombre, id_catalog e id son requeridos' });
                return;
            }

            const item = await catalogService.updateCatalogItem({
                id_catalog_item,
                id_catalog: Number(id_catalog), 
                nombre: nombre.trim(),
                filterValue: filterValue ? Number(filterValue) : null
            });

            const response: ApiResponseInterface = {
                success: true, 
                message: 'Editado correctamente',
                data: item
            }

            res.status(200).json(response);
        } catch (error: any) {
            next(error);
        }
    }


    async deleteCatalogItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id_catalog_item = Number(req.query['id_catalog_item']);
            const id_catalog = Number(req.query['id_catalog']); 

            if (!id_catalog_item || !id_catalog) {
                res.status(400).json({ success: false, message: 'id_catalog_item e id_catalog son requeridos' });
                return;
            }

            await catalogService.deleteCatalogItem(id_catalog_item, id_catalog);
            const response: ApiResponseInterface = {
                success: true, 
                message: 'Item eliminado correctamente',
                data: []
            }
            res.status(200).json(response);
        } catch (error: any) {
            next(error);
        }
    }

    async getDepartamento(_: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await catalogService.getDepartamentos();
            const response: ApiResponseInterface = {
                success: true,
                message: 'Departamentos cargados correctamente',
                data
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getComunidades(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { ids_departamentos } = req.body;
            const data = await catalogService.getComunidadesByIdsDepto(ids_departamentos);
            const response: ApiResponseInterface = {
                success: true,
                message: 'Comunidades cargadas correctamente',
                data
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getCatalogItems(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { filterValue } = req.query;

            const items = await catalogService.getCatalogItems(
                Number(id),
                filterValue ? String(filterValue) : undefined
            );

            res.status(200).json({
                success: true,
                message: 'Items del catálogo',
                data: items
            });
        } catch (error) {
            next(error);
        }
    }

    async getCatalogMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const metadata = await catalogService.getCatalogMetadata(Number(id));

            res.status(200).json({
                success: true,
                message: 'Metadata del catálogo',
                data: metadata
            });
        } catch (error) {
            next(error);
        }
    }
}

export const catalogController = new CatalogController();