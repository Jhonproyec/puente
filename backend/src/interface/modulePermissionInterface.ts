export interface ModuleInterface{
    id_module?: number;
    name:  String;
    permissions?: PermissionsInterface[] 
}

export interface PermissionsInterface{
    id_permission?: number;
    id_module: number;
    name: string;
    code: string;
    descripcion: string;
}

export interface RolInterface{
    id_rol?: number;
    name: string;
    permissions: number[];
    cantidad_permisos?: number;
    fecha_registro?: any 
}