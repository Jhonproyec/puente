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

export interface RolesInterface{
    id_rol?: number;
    name: string;
    permissions: number[];
    count_permissions: number;
    created_at?: any;
}
