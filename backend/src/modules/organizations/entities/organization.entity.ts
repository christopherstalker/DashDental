export type OrganizationStatus = 'active' | 'trial' | 'suspended';

export interface OrganizationEntity {
  id: string;
  name: string;
  timezone: string;
  currency: 'USD' | 'EUR' | 'UAH';
  averagePatientValue: number;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}
