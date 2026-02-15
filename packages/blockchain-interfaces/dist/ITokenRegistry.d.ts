export interface VehicleToken {
    tokenId: string;
    vin: string;
    history: VehicleHistoryEntry[];
    createdAt: Date;
    lastUpdated: Date;
}
export interface VehicleHistoryEntry {
    type: 'service' | 'sale' | 'inspection' | 'accident' | 'recall';
    description: string;
    mileage: number;
    date: Date;
    provider: string;
    verified: boolean;
}
export interface ITokenRegistry {
    mint(vin: string, initialData: Partial<VehicleToken>): Promise<VehicleToken>;
    addHistory(vin: string, entry: VehicleHistoryEntry): Promise<VehicleToken>;
    getToken(vin: string): Promise<VehicleToken | null>;
    verifyHistory(vin: string): Promise<boolean>;
}
//# sourceMappingURL=ITokenRegistry.d.ts.map