import { ApiResponseInterface } from "@/interface/apiResponseInterface";
import { RolInterface } from "@/interface/modulePermissionInterface";
import { rolPermissionService } from "@/services/rol_permission.service";
import { Request, Response, NextFunction } from "express";

 export class RolPermissionController{
    async getAllModulesPermission(_: Request, res: Response, next: NextFunction):Promise<void>{
        try {
            const modules = await rolPermissionService.getModulePermission();
            const response: ApiResponseInterface = {
                success: true, 
                message: 'Datos obtenidos correctamente',
                data: modules
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async createRol(req: Request, res: Response, next: NextFunction):Promise<void>{
        try {
            const {nombre, permisos} = req.body;
            const data: RolInterface = {
                name: nombre, 
                permissions: permisos
            };
            const rol = await rolPermissionService.createRol(data);
            const response: ApiResponseInterface = {
                success: true, 
                message: 'Rol creado correctamente',
                data: rol
            }
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async updateRol(req: Request, res: Response, next: NextFunction):Promise<void>{
        try {
            const{nombre, permisos} = req.body;
            const{id_rol} = req.query
            const data: RolInterface = {
                name: nombre, 
                id_rol: Number(id_rol),
                permissions: permisos
            };
            const rol = await rolPermissionService.updateRol(data);
            const response: ApiResponseInterface = {
                success: true, 
                message: 'Rol editado correctamente',
                data: rol
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getAllRoles(_: Request, res: Response, next: NextFunction):Promise<void>{
        try {
            const roles = await rolPermissionService.getAllRoles();
            const response: ApiResponseInterface = {
                success: true, 
                message: 'Roles cargados correctamente',
                data: roles
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async deleteRol(req: Request, res: Response, next: NextFunction):Promise<void>{
        try {
            const{id_rol} = req.query;
            await rolPermissionService.deleteRol(Number(id_rol));
            const response: ApiResponseInterface = {
                success: true, 
                message: 'Rol eliminado',
                data:[]
            }
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
 }

 export const rolPermissionController =new RolPermissionController();