export interface AutomationRuleEntity {
  id: string;
  organizationId: string;
  trigger: 'first_inbound' | 'outside_business_hours' | 'sla_warning';
  conditionsJson: Record<string, unknown>;
  template: string;
  active: boolean;
  createdBy: string;
}
