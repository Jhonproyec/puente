import { CatalogoItemResponse } from "./catalogItemInterface";

export interface CatalogResponse {
    id_catalogo: number;
    nombre: string;
    items?: CatalogoItemResponse[];
    totalItems?: number;
}