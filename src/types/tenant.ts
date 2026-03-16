export type TenantStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DISABLED";

export interface TenantFeature {
  feature: string;
  enabled: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  address: string | null;
  website: string | null;
  timezone: string;
  language: string;
  status: TenantStatus;
  features?: TenantFeature[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateTenantDto {
  name?: string;
  logo?: string;
  address?: string;
  website?: string;
  timezone?: string;
  language?: string;
}
