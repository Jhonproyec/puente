export interface UpdateUserDataInterface {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'ADMIN' | 'SELLER';
}

export interface UserProfileInterface{
  idUser: number;
  firstName: string;
  lastName: string;
  rol: any,
  forms?: any,
  departaments?: any;
  comunidades?: any;
  access_global: boolean;
  email: string;
  dpi: string | null;
}

