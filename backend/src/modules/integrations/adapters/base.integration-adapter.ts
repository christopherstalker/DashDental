export interface IntegrationAdapter {
  readonly provider: string;
  getHealthSnapshot(): Promise<{ provider: string; status: string; score: number }>;
}
