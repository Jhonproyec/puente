import { dashboardService } from "@/services/dashboard.service";
import { Request, Response, NextFunction } from "express";
let cache: any = null;
let lastUpdate: number = 0;
const CACHE_TTL =  5 * 50 * 1000;

class DashboardController{
    async getKpi(_: Request, res: Response, next: NextFunction){
        try {
            const now = Date.now();
            if(!cache || now - lastUpdate > CACHE_TTL){
                cache = await dashboardService.getDashboardData();
                lastUpdate = now;
            }
                    
            res.status(200).json({
                success: true, 
                message: 'KPI',
                data: cache
            })
        } catch (error) {
            next(error);
        }
    }
}

export const dashboardController = new DashboardController();