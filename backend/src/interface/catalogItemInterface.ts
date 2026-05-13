export interface CatalogoItemResponse {
    id_catalog_item: number;
    id_catalog: number;
    nombre: string;
    filterValue?: number | null;
}

export interface CreateCatalogItemInterface {
    id_catalog: number;
    nombre: string;
    filterValue?: number | null;
}

export interface UpdateCatalogItemInterface {
    id_catalog_item: number;
    id_catalog: number; 
    nombre: string;
    filterValue?: number | null;
}