import { Request } from 'express';
export interface AuthenticatedRequestInterface extends Request {
  user?: {
    id: number;
    email: string;
    role?: string | undefined;
  };
}

export interface JWTPayloadInterface {
  userId: number;
  email: string;
  role?: string;
  iat?: string;
  exp?: number;
}

export interface RegisterUserDataInterface {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: number;
  departaments: Array<number> | null;
  comunidades: Array<number> | null;
  forms: Array<number>;
  dpi: string;
}

export interface LoginUserDataInterface {
  email: string;
  password: string;
}

export interface AuthTokensInterface {
  accessToken: string;
  refreshToken: string;
}

export interface UserPayloadInterface {
  idUser: number;
  email: string;
  firstName: string;
  lastName: string;
  rol: any;
  isActive?: boolean;
  forms?: any;
  deparaments?: Array<number>| null;
  comunidades?: Array<number>| null;
  access_global?: boolean;
  dpi: string;
}
