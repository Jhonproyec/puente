export interface CentroNutremeInterface {
    id_centro_nutreme?: number;
    uuid?: string;           
    codigo: string;
    nombre: string;
    id_comunidad: number;
    id_usuario: number | null;
    coordenadas?: string | null;  
    qr_path?: string | null;
    estado_registro?: boolean;    
    fecha_registro?: any;
    fecha_edicion?: any;
}

// En centroNutremeInterface.ts agrega:
export interface UpdateCentroNutremeInterface {
    codigo?: string;
    nombre?: string;
    id_comunidad?: number;
    id_usuario?: number | null;
    coordenadas?: string | null;
}