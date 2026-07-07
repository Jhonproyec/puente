export interface User{
    idUser: number;
    email: string;
    firstName: string;
    lastName: string;
    rol: string;
    access_global: boolean;
    permissions: string[];
    dpi: string | null;
}

export interface FormSession{
    uuid: string;
    nombre: string;
}

export interface CreateUserRequest{
    userId?: string | null;
    comunidades: Array<number> | null;
    departamentos: Array<number> | null;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: number;
}

