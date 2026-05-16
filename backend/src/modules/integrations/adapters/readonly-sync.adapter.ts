export interface ReadonlySyncAdapter {
  readonly provider: string;
  sync(organizationId: string, limit?: number): Promise<{
    imported: number;
    updated: number;
    skipped: number;
  }>;
}
