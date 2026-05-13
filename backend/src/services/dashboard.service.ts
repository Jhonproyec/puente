
class DashboardService {
    async getDashboardData() {
        return of();
    }
}
export const dashboardService = new DashboardService();
function of() {
    throw new Error("Function not implemented.");
}

