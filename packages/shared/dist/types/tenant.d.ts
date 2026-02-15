export type TenantPlan = 'starter' | 'professional' | 'enterprise';
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: TenantPlan;
    isActive: boolean;
    settings: Record<string, unknown>;
    createdAt: Date;
}
//# sourceMappingURL=tenant.d.ts.map