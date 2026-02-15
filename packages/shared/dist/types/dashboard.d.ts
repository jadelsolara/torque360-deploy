export interface DashboardStats {
    totalVehicles: number;
    totalClients: number;
    activeWorkOrders: number;
    pendingQuotations: number;
    lowStockItems: number;
}
export interface DashboardKPIs {
    avgRepairTime: number;
    revenueThisMonth: number;
    topBrands: {
        brand: string;
        count: number;
    }[];
}
//# sourceMappingURL=dashboard.d.ts.map