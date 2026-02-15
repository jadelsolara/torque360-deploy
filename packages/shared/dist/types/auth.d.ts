export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
export interface UserPayload {
    sub: string;
    email: string;
    tenantId: string;
    role: Role;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface LoginResponse {
    user: UserPayload;
    tenant: {
        id: string;
        name: string;
        slug: string;
        plan: string;
    };
    accessToken: string;
    refreshToken: string;
}
export interface RegisterTenantRequest {
    tenantName: string;
    tenantSlug: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    plan?: string;
}
//# sourceMappingURL=auth.d.ts.map