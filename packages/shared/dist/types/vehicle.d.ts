export type VehicleStatus = 'active' | 'in_service' | 'sold' | 'scrapped';
export interface Vehicle {
    id: string;
    tenantId: string;
    vin: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    engineType: string;
    transmission: string;
    mileage: number;
    clientId: string;
    status: VehicleStatus;
    metadata: Record<string, unknown>;
}
//# sourceMappingURL=vehicle.d.ts.map