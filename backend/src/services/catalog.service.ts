import { prisma } from "@/config/database";
import { CatalogResponse } from "@/interface/catalogInterface";
import { cacheService } from "./cache.service";
import { logger } from "@/config/logger";
import { CatalogoItemResponse, CreateCatalogItemInterface, UpdateCatalogItemInterface } from "@/interface/catalogItemInterface";
import { ConflictError } from "@/utils/appError";


const KEY_CATALOG = 'catalogs';
const KEY_ITEM_CATALOG = `${KEY_CATALOG}:item`;

// ── Claves centralizadas ────────────────────────────────────────────────────
const cacheKeys = {
    allCatalogs: () => `${KEY_CATALOG}:all`,
    catalogById: (id: number) => `${KEY_ITEM_CATALOG}:${id}`,
    catalogItems: (id: number) => `${KEY_ITEM_CATALOG}:items:${id}`,
    departamentos: () => `${KEY_CATALOG}:departamentos`,
    comunidad: (id: number) => `${KEY_CATALOG}:comunidad:${id}`,
};

export class CatalogService {

    // ── CATÁLOGOS ───────────────────────────────────────────────────────────

    async getAllCatalogs(): Promise<CatalogResponse[]> {
        try {
            const cacheKey = cacheKeys.allCatalogs();
            const cached = cacheService.get<CatalogResponse[]>(cacheKey);
            if (cached) {
                logger.info(`[CACHE HIT] ${cacheKey}`);
                return cached;
            }

            logger.info(`[CACHE MISS] ${cacheKey}`);
            const catalogs = await prisma.catalog.findMany({
                where: { estado_registro: true },
                include: {
                    items: { where: { estado_registro: true } }
                },
                orderBy: { nombre: 'asc' }
            });

            const response: CatalogResponse[] = catalogs.map((cat) => ({
                id_catalogo: cat.id_catalogo,
                nombre: cat.nombre,
                totalItems: cat.items.length
            }));

            cacheService.set(cacheKey, response);
            return response;
        } catch (error) {
            logger.error('Error en obtener todos los catalogos', error);
            throw error;
        }
    }

    async getCatalogById(id_catalogo: number): Promise<CatalogResponse | null> {
        try {
            const cacheKey = cacheKeys.catalogById(id_catalogo);
            const cached = cacheService.get<CatalogResponse>(cacheKey);
            if (cached) {
                logger.info(`[CACHE HIT] ${cacheKey}`);
                return cached;
            }

            logger.info(`[CACHE MISS] ${cacheKey}`);
            const catalog = await prisma.catalog.findUnique({
                where: { id_catalogo },
                include: {
                    items: { where: { estado_registro: true } }
                }
            });

            if (!catalog) return null;

            const response: CatalogResponse = {
                id_catalogo: catalog.id_catalogo,
                nombre: catalog.nombre,
                items: catalog.items.map((item) => ({
                    id_catalog: item.id_catalog,
                    id_catalog_item: item.id_catalog_item,
                    nombre: item.nombre
                }))
            };

            cacheService.set(cacheKey, response);
            return response;
        } catch (error) {
            logger.error("Error al obtener el catálogo", error);
            throw error;
        }
    }

    async createCatalog(data: { nombre: string }): Promise<CatalogResponse> {
        try {
            const catalog = await prisma.catalog.create({
                data: { nombre: data.nombre },
            });

            const response: CatalogResponse = {
                id_catalogo: catalog.id_catalogo,
                nombre: catalog.nombre
            };

            cacheService.delete(cacheKeys.allCatalogs());
            return response;
        } catch (error) {
            logger.error("Error al crear el catálogo", error);
            throw error;
        }
    }

    async updateCatalog(data: { id_catalogo: number, nombre: string }): Promise<CatalogResponse> {
        try {
            const existsCatalog = await prisma.catalog.findUnique({
                where: { id_catalogo: data.id_catalogo }
            });

            if (!existsCatalog) throw new ConflictError("No se encontró el catálogo");

            const updated = await prisma.catalog.update({
                where: { id_catalogo: data.id_catalogo },
                data: { nombre: data.nombre }
            });

            const response: CatalogResponse = {
                id_catalogo: updated.id_catalogo,
                nombre: updated.nombre,
            };

            cacheService.delete(cacheKeys.allCatalogs());
            cacheService.delete(cacheKeys.catalogById(updated.id_catalogo));
            cacheService.delete(cacheKeys.catalogItems(updated.id_catalogo));
            return response;
        } catch (error) {
            logger.error("Error al editar el catálogo", error);
            throw error;
        }
    }

    async deleteCatalogs(ids: number[]): Promise<void> {
        try {
            await prisma.$transaction(async (tx) => {

                // 1. Verificar que todos los catálogos existen antes de hacer cualquier cambio
                const existingCatalogs = await tx.catalog.findMany({
                    where: {
                        id_catalogo: { in: ids },
                        estado_registro: true
                    },
                    select: { id_catalogo: true, nombre: true }
                });

                if (existingCatalogs.length !== ids.length) {
                    const foundIds = existingCatalogs.map(c => c.id_catalogo);
                    const notFound = ids.filter(id => !foundIds.includes(id));
                    throw new ConflictError(`Catálogos no encontrados: ${notFound.join(', ')}`);
                }

                // 2. Soft delete de los items de todos los catálogos
                await tx.catalogItem.updateMany({
                    where: {
                        id_catalog: { in: ids },
                        estado_registro: true
                    },
                    data: { estado_registro: false }
                });

                // 3. Soft delete de los catálogos
                await tx.catalog.updateMany({
                    where: { id_catalogo: { in: ids } },
                    data: { estado_registro: false }
                });

            }); // Si algo falla aquí, Prisma revierte TODO automáticamente

            // 4. Limpiar caché solo si la transacción fue exitosa
            cacheService.delete(cacheKeys.allCatalogs());
            ids.forEach(id => {
                cacheService.delete(cacheKeys.catalogById(id));
                cacheService.delete(cacheKeys.catalogItems(id));
            });

            logger.info(`Catálogos eliminados: ${ids.join(', ')}`);

        } catch (error) {
            logger.error('Error al eliminar catálogos, se hizo rollback', error);
            throw error;
        }
    }

    // ── ITEMS DE CATÁLOGO ───────────────────────────────────────────────────

    async createCatalogItem(data: CreateCatalogItemInterface): Promise<CatalogoItemResponse> {
        try {
            const catalog = await prisma.catalog.findUnique({
                where: { id_catalogo: data.id_catalog }
            });

            if (!catalog) throw new ConflictError('Catálogo no encontrado');

            let createdItem: CatalogoItemResponse;

            if (catalog.tabla_origen && this.tableMapper[catalog.tabla_origen]?.create) {
                // Catálogo con tabla propia (comunidad, centroAtencion, etc.)
                const mapper = this.tableMapper[catalog.tabla_origen];
                const raw = await mapper.create!({
                    nombre: data.nombre,
                    ...(data.filterValue !== undefined && { filterValue: data.filterValue })
                });

                createdItem = {
                    id_catalog_item: raw[mapper.idField],
                    id_catalog: data.id_catalog,
                    nombre: raw.nombre,
                };
            } else {
                // Catálogo simple → CatalogItem
                const item = await prisma.catalogItem.create({
                    data: {
                        id_catalog: data.id_catalog,
                        nombre: data.nombre
                    }
                });

                createdItem = {
                    id_catalog_item: item.id_catalog_item,
                    id_catalog: item.id_catalog,
                    nombre: item.nombre,
                };
            }

            cacheService.delete(cacheKeys.allCatalogs());
            cacheService.delete(cacheKeys.catalogById(data.id_catalog));
            cacheService.delete(cacheKeys.catalogItems(data.id_catalog));

            return createdItem;
        } catch (error) {
            logger.error('Error al crear el item del catálogo', error);
            throw error;
        }
    }

    async updateCatalogItem(data: UpdateCatalogItemInterface): Promise<CatalogoItemResponse> {
        try {
            // 1. Buscar el catálogo para saber en qué tabla vive el item
            const catalog = await prisma.catalog.findUnique({
                where: { id_catalogo: data.id_catalog }
            });

            if (!catalog) throw new ConflictError('Catálogo no encontrado');

            // 2. Si tiene tabla_origen → actualizar en la tabla propia
            if (catalog.tabla_origen && this.tableMapper[catalog.tabla_origen]?.update) {
                const mapper = this.tableMapper[catalog.tabla_origen];
                const raw = await mapper.update!(data.id_catalog_item, { nombre: data.nombre });

                cacheService.delete(cacheKeys.allCatalogs());
                cacheService.delete(cacheKeys.catalogById(data.id_catalog));
                cacheService.delete(cacheKeys.catalogItems(data.id_catalog));

                return {
                    id_catalog_item: raw[mapper.idField],
                    id_catalog: data.id_catalog,
                    nombre: raw.nombre,
                };
            }

            // 3. Catálogo simple → actualizar en CatalogItem
            const existItem = await prisma.catalogItem.findUnique({
                where: { id_catalog_item: data.id_catalog_item }
            });

            if (!existItem) throw new ConflictError('Item no encontrado');

            const updated = await prisma.catalogItem.update({
                where: { id_catalog_item: data.id_catalog_item },
                data: { nombre: data.nombre }
            });

            cacheService.delete(cacheKeys.allCatalogs());
            cacheService.delete(cacheKeys.catalogById(updated.id_catalog));
            cacheService.delete(cacheKeys.catalogItems(updated.id_catalog));

            return {
                id_catalog_item: updated.id_catalog_item,
                id_catalog: updated.id_catalog,
                nombre: updated.nombre,
            };
        } catch (error) {
            logger.error('Error al editar el item', error);
            throw error;
        }
    }



    async deleteCatalogItem(id_catalog_item: number, id_catalog: number): Promise<void> {
        try {
            const catalog = await prisma.catalog.findUnique({
                where: { id_catalogo: id_catalog }
            });

            if (!catalog) throw new ConflictError('Catálogo no encontrado');

            if (catalog.tabla_origen && this.tableMapper[catalog.tabla_origen]?.delete) {
                const mapper = this.tableMapper[catalog.tabla_origen];
                await mapper.delete!(id_catalog_item);
            } else {
                const existItem = await prisma.catalogItem.findUnique({
                    where: { id_catalog_item }
                });
                if (!existItem) throw new ConflictError('Item no encontrado');
                await prisma.catalogItem.update({
                    where: { id_catalog_item },
                    data: { estado_registro: false }
                });
            }

            cacheService.delete(cacheKeys.allCatalogs());
            cacheService.delete(cacheKeys.catalogById(id_catalog));
            cacheService.delete(cacheKeys.catalogItems(id_catalog));

        } catch (error) {
            logger.error('Error al eliminar el item', error);
            throw error;
        }
    }
    async getCatalogItems(id_catalogo: number, filterValue?: string): Promise<{ id: number, nombre: string, padre?: string }[]> {
        try {
            const cacheKey = cacheKeys.catalogItems(id_catalogo);
            const cached = cacheService.get<{ id: number, nombre: string, padre?: string }[]>(cacheKey);
            if (cached) {
                logger.info(`[CACHE HIT] ${cacheKey}`);
                return cached;
            }

            logger.info(`[CACHE MISS] ${cacheKey}`);
            const catalog = await prisma.catalog.findUnique({
                where: { id_catalogo }
            });

            if (!catalog) throw new ConflictError('Catálogo no encontrado');

            let items: { id: number, nombre: string, padre?: string }[] = [];

            if (catalog.tabla_origen && this.tableMapper[catalog.tabla_origen]) {
                const mapper = this.tableMapper[catalog.tabla_origen];
                const where = filterValue && mapper.filterField
                    ? { [mapper.filterField]: Number(filterValue) }
                    : {};

                const rows = await mapper.findMany(where);

                items = rows.map(row => ({
                    id: row[mapper.idField],
                    nombre: row.nombre,
                    ...(mapper.parentField && row[mapper.parentField] ? {
                        padre: row[mapper.parentField].nombre,
                        parentId: row[mapper.parentField][mapper.filterField!],
                        // Para centroAtencion necesitamos también el id_departamento del padre
                        ...(row[mapper.parentField].id_departamento !== undefined ? {
                            grandParentId: row[mapper.parentField].id_departamento
                        } : {})
                    } : {})
                }));
            } else {
                const rows = await prisma.catalogItem.findMany({
                    where: { id_catalog: id_catalogo, estado_registro: true },
                    // orderBy: { id_catalog_item: 'desc' }
                });
                items = rows.map(row => ({
                    id: row.id_catalog_item,
                    nombre: row.nombre
                }));
            }

            cacheService.set(cacheKey, items);
            return items;
        } catch (error) {
            logger.error('Error al obtener items del catálogo', error);
            throw error;
        }
    }

    async getCatalogMetadata(id_catalogo: number): Promise<{ filterFields: string[], parentLabel?: string }> {
        try {
            const catalog = await prisma.catalog.findUnique({
                where: { id_catalogo }
            });

            if (!catalog) throw new ConflictError('Catálogo no encontrado');

            const parentLabel = catalog.tabla_origen
                ? this.tableMapper[catalog.tabla_origen]?.parentLabel
                : undefined;

            return {
                filterFields: catalog.campo_filtro ? [catalog.campo_filtro] : [],
                ...(parentLabel ? { parentLabel } : {})
            };
        } catch (error) {
            logger.error('Error al obtener metadata del catálogo', error);
            throw error;
        }
    }

    // ── DEPARTAMENTOS Y COMUNIDADES ─────────────────────────────────────────

    async getDepartamentos(): Promise<CatalogResponse[]> {
        try {
            const cacheKey = cacheKeys.departamentos();
            const cached = cacheService.get<CatalogResponse[]>(cacheKey);
            if (cached) {
                logger.info(`[CACHE HIT] ${cacheKey}`);
                return cached;
            }

            logger.info(`[CACHE MISS] ${cacheKey}`);
            const data = await prisma.departamento.findMany({
                where: { estado_registro: true }
            });

            const departamentos: CatalogResponse[] = data.map(dep => ({
                id_catalogo: dep.id_departamento,
                nombre: dep.nombre
            }));

            cacheService.set(cacheKey, departamentos);
            return departamentos;
        } catch (error) {
            logger.error('Error al obtener los departamentos', error);
            throw error;
        }
    }

    async getComunidadesByIdsDepto(ids_departamentos: Array<number>): Promise<any> {
        try {
            const data = await prisma.comunidad.findMany({
                where: { estado_registro: true, id_departamento: { in: ids_departamentos } }
            });

            return data.map(com => ({
                id_catalogo: com.id_comunidad,
                id_departamento: com.id_departamento,
                nombre: com.nombre
            }));
        } catch (error) {
            logger.error('Error al obtener las comunidades por departamentos', error);
            throw error;
        }
    }

    async getComunidad(id_departamento: number): Promise<any> {
        try {
            const cacheKey = cacheKeys.comunidad(id_departamento);
            const cached = cacheService.get(cacheKey);
            if (cached) {
                logger.info(`[CACHE HIT] ${cacheKey}`);
                return cached;
            }

            logger.info(`[CACHE MISS] ${cacheKey}`);
            const data = await prisma.comunidad.findMany({
                where: { estado_registro: true, id_departamento }
            });

            const comunidades = data.map(com => ({
                id_catalogo: com.id_comunidad,
                id_departamento: com.id_departamento,
                nombre: com.nombre
            }));

            cacheService.set(cacheKey, comunidades);
            return comunidades;
        } catch (error) {
            logger.error('Error al obtener las comunidades', error);
            throw error;
        }
    }

    // ── Helper: obtiene id_catalogo a partir del tabla_origen ──────────────────
    // private async getCatalogIdByTablaOrigen(tabla_origen: string): Promise<number | null> {
    //     const catalog = await prisma.catalog.findFirst({
    //         where: { tabla_origen, estado_registro: true },
    //         select: { id_catalogo: true }
    //     });
    //     return catalog?.id_catalogo ?? null;
    // }

    // ── TABLE MAPPER ────────────────────────────────────────────────────────
    private tableMapper: Record<string, {
        findMany: (where?: any) => Promise<any[]>,
        idField: string,
        filterField?: string,
        parentField?: string,
        parentLabel?: string,
        create?: (data: { nombre: string; filterValue?: number | null }) => Promise<any>,
        update?: (id: number, data: { nombre: string }) => Promise<any>,
        delete?: (id: number) => Promise<any>,
    }> = {
            'departamento': {
                findMany: (where = {}) => prisma.departamento.findMany({
                    where: { estado_registro: true, ...where },
                    orderBy: { id_departamento: 'desc' }
                }),
                idField: 'id_departamento',
                create: ({ nombre }) => { 
                    return prisma.departamento.create({
                        data: { nombre }
                    });
                },
                update: (id, { nombre }) => prisma.departamento.update({
                    where: { id_departamento: id },
                    data: { nombre }
                }),
                delete: (id) => prisma.departamento.update({
                    where: { id_departamento: id },
                    data: { estado_registro: false }
                }),
            },
            'comunidad': {
                findMany: (where = {}) => prisma.comunidad.findMany({
                    where: { estado_registro: true, ...where },
                    include: { departamento: { select: { id_departamento: true, nombre: true } } },
                    orderBy: { id_comunidad: 'desc' }
                }),
                idField: 'id_comunidad',
                filterField: 'id_departamento',
                parentField: 'departamento',   // 👈
                parentLabel: 'Departamento',   // 👈
                create: ({ nombre, filterValue }) => {
                    if (!filterValue) throw new ConflictError('Debes seleccionar un departamento');
                    return prisma.comunidad.create({
                        data: { nombre, id_departamento: filterValue }
                    });
                },
                update: (id, { nombre }) => prisma.comunidad.update({
                    where: { id_comunidad: id },
                    data: { nombre }
                }),
                delete: (id) => prisma.comunidad.update({
                    where: { id_comunidad: id },
                    data: { estado_registro: false }
                }),
            },
            'centroAtencion': {
                findMany: (where = {}) => prisma.centroAtencion.findMany({
                    where: { estado_registro: true, ...where },
                    include: {
                        comunidad: {
                            select: {
                                id_comunidad: true,
                                nombre: true,
                                id_departamento: true
                            }
                        }
                    },
                    orderBy: { id_centro: 'desc' }
                }),
                idField: 'id_centro',
                filterField: 'id_comunidad',
                parentField: 'comunidad',
                parentLabel: 'Comunidad', 
                create: ({ nombre, filterValue }) => {
                    if (!filterValue) throw new ConflictError('Debes seleccionar una comunidad');
                    return prisma.centroAtencion.create({
                        data: { nombre, id_comunidad: filterValue }
                    });
                },
                update: (id, { nombre }) => prisma.centroAtencion.update({
                    where: { id_centro: id },
                    data: { nombre }
                }),
                delete: (id) => prisma.centroAtencion.update({
                    where: { id_centro: id },
                    data: { estado_registro: false }
                }),
            },
            'rangoHito': {
                findMany: (where = {}) => prisma.rangoHito.findMany({ where, orderBy: { id_rango_hito: 'desc' } },),
                idField: 'id_rango_hito'
            },
            'rangoHitoDetalle': {
                findMany: (where = {}) => prisma.rangoHitoDetalle.findMany({ where, orderBy: { id_rango_hito_detalle: 'desc' } }),
                idField: 'id_rango_hito_detalle',  // corregido: era 'id_detalle'
                filterField: 'id_rango_hito',
                create: ({ nombre, filterValue }) => {
                    if (!filterValue) throw new ConflictError('Debes seleccionar un rango hito');
                    return prisma.rangoHitoDetalle.create({
                        data: { nombre, id_rango_hito: filterValue }
                    });
                },
                update: (id, { nombre }) => prisma.rangoHitoDetalle.update({
                    where: { id_rango_hito_detalle: id },
                    data: { nombre }
                }),
                delete: (id) => prisma.rangoHitoDetalle.update({
                    where: { id_rango_hito_detalle: id },
                    data: { estado_registro: false }
                }),
            },
        };
}

export const catalogService = new CatalogService();