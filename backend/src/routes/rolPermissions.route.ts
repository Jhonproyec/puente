import { rolPermissionController } from "@/controllers/rolPermissionController";
import { Router } from "express";

export const rolPermissionRoute =  Router();

rolPermissionRoute.get('/allPermission', rolPermissionController.getAllModulesPermission);
rolPermissionRoute.get('/allRoles', rolPermissionController.getAllRoles);
rolPermissionRoute.post('/create', rolPermissionController.createRol);
rolPermissionRoute.put('/update', rolPermissionController.updateRol);
rolPermissionRoute.delete('/delete', rolPermissionController.deleteRol);