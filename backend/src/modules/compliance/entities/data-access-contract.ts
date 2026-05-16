export interface DataAccessContractEntity {
  id: string;
  organizationId: string;
  provider: 'clinic_database';
  status: 'draft' | 'pending_it_approval' | 'approved' | 'revoked';
  purpose: string;
  tables: string[];
  fields: string[];
  piiCategories: string[];
  retentionDays: number;
  readOnly: boolean;
  approvedByName?: string;
  approvedByEmail?: string;
  approvedAt?: string;
  revokedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
