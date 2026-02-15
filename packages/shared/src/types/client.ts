export type ClientType = 'individual' | 'company';

export interface Client {
  id: string;
  tenantId: string;
  rut: string;
  type: ClientType;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
}
