export interface CatalogImagesInterface {
    id_catalogo_imagen?: number,
    name: string, 
    file_name: string;
    path: string;
    size: number,
    mime_type: string,
    created_at: any,
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}