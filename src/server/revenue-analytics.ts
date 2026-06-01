import { deriveLeadStatus, formatProvider, getLeadResponseMinutes } from "@/domain/business-rules";
import type { AppState, Provider } from "@/domain/types";

export interface RevenueSourceRow {
  provider: Provider;
  label: string;
  inquiries: number;
  booked: number;
  bookedRevenue: number;
  atRiskRevenue: number;
  lostRevenue: number;
  averageResponseMinutes: number;
  conversionRate: number;
}

export interface RevenueAnalyticsSummary {
  totalInquiries: number;
  bookedRevenue: number;
  atRiskRevenue: number;
  lostRevenue: number;
  responseRevenue: number;
  sourceRows: RevenueSourceRow[];
}

function average(values: number[]): number {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

export function buildRevenueAnalytics(
  state: Pick<AppState, "leads">,
  organizationId: string,
  nowIso = new Date().toISOString(),
): RevenueAnalyticsSummary {
  const leads = state.leads.filter((lead) => lead.organizationId === organizationId);
  const sourceRows = new Map<Provider, RevenueSourceRow>();

  for (const lead of leads) {
    const status = deriveLeadStatus(lead, nowIso);
    const row =
      sourceRows.get(lead.source) ??
      {
        provider: lead.source,
        label: formatProvider(lead.source),
        inquiries: 0,
        booked: 0,
        bookedRevenue: 0,
        atRiskRevenue: 0,
        lostRevenue: 0,
        averageResponseMinutes: 0,
        conversionRate: 0,
      };

    row.inquiries += 1;

    if (status === "booked") {
      row.booked += 1;
      row.bookedRevenue += lead.estimatedValue;
    } else if (status === "lost") {
      row.lostRevenue += lead.estimatedValue;
    } else if (status === "at_risk" || status === "unanswered") {
      row.atRiskRevenue += lead.estimatedValue;
    }

    sourceRows.set(lead.source, row);
  }

  for (const row of sourceRows.values()) {
    const sourceLeads = leads.filter((lead) => lead.source === row.provider);
    row.averageResponseMinutes = average(
      sourceLeads
        .map(getLeadResponseMinutes)
        .filter((value): value is number => value !== null),
    );
    row.conversionRate = row.inquiries ? Math.round((row.booked / row.inquiries) * 100) : 0;
  }

  const rows = Array.from(sourceRows.values()).toSorted(
    (left, right) =>
      right.lostRevenue + right.atRiskRevenue - (left.lostRevenue + left.atRiskRevenue),
  );

  return {
    totalInquiries: leads.length,
    bookedRevenue: rows.reduce((sum, row) => sum + row.bookedRevenue, 0),
    atRiskRevenue: rows.reduce((sum, row) => sum + row.atRiskRevenue, 0),
    lostRevenue: rows.reduce((sum, row) => sum + row.lostRevenue, 0),
    responseRevenue: rows.reduce((sum, row) => sum + row.bookedRevenue - row.lostRevenue, 0),
    sourceRows: rows,
  };
}
