"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, Clock3, Inbox, TrendingUp, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { LeadStatus, Provider } from "@/domain/types";

export interface AnalyticsLead {
  assignedTo?: string;
  firstHumanResponseAt?: string;
  firstMessageAt: string;
  id: string;
  source: Provider;
  status: LeadStatus;
}

export interface AnalyticsStaffMember {
  id: string;
  name: string;
}

type RangeKey = "7d" | "14d" | "30d" | "90d";

const ranges: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "14d", label: "14 days", days: 14 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
];

const providerLabels: Record<Provider, string> = {
  clinic_database: "Clinic DB",
  instagram: "Instagram",
  telegram: "Telegram",
  web_form: "Web",
  whatsapp: "WhatsApp",
};

function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000));
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDay(value: string): string {
  const [, month, day] = value.split("-");
  return `${month}/${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function percent(value: number, total: number): string {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

function formatMinutes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0m";
  }

  if (value < 60) {
    return `${Math.round(value)}m`;
  }

  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function latestDate(leads: AnalyticsLead[]): Date {
  const latest = leads.reduce((max, lead) => Math.max(max, Date.parse(lead.firstMessageAt)), 0);
  return latest ? new Date(latest) : new Date();
}

function filterLeads(leads: AnalyticsLead[], range: RangeKey): AnalyticsLead[] {
  const selected = ranges.find((item) => item.key === range) ?? ranges[1];
  const end = latestDate(leads);
  const start = addDays(end, -(selected.days - 1));
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  return leads.filter((lead) => {
    const timestamp = Date.parse(lead.firstMessageAt);
    return timestamp >= start.getTime() && timestamp <= end.getTime();
  });
}

function buildLineData(leads: AnalyticsLead[], range: RangeKey) {
  const selected = ranges.find((item) => item.key === range) ?? ranges[1];
  const end = latestDate(leads);
  end.setUTCHours(0, 0, 0, 0);
  const start = addDays(end, -(selected.days - 1));
  const rows = new Map<string, Record<string, string | number>>();

  for (let index = 0; index < selected.days; index += 1) {
    const date = addDays(start, index);
    rows.set(dayKey(date), {
      date: formatDay(dayKey(date)),
      WhatsApp: 0,
      Instagram: 0,
      Telegram: 0,
      Web: 0,
    });
  }

  for (const lead of filterLeads(leads, range)) {
    const row = rows.get(dayKey(new Date(lead.firstMessageAt)));
    if (!row) {
      continue;
    }

    const label = providerLabels[lead.source] === "Web" ? "Web" : providerLabels[lead.source];
    if (typeof row[label] === "number") {
      row[label] += 1;
    }
  }

  return Array.from(rows.values());
}

function buildDistribution(leads: AnalyticsLead[]) {
  const buckets = [
    { name: "<5m", count: 0 },
    { name: "5-15m", count: 0 },
    { name: "15-60m", count: 0 },
    { name: ">60m", count: 0 },
    { name: "No reply", count: 0 },
  ];

  for (const lead of leads) {
    if (!lead.firstHumanResponseAt) {
      buckets[4].count += 1;
      continue;
    }

    const minutes = minutesBetween(lead.firstMessageAt, lead.firstHumanResponseAt);
    if (minutes < 5) buckets[0].count += 1;
    else if (minutes <= 15) buckets[1].count += 1;
    else if (minutes <= 60) buckets[2].count += 1;
    else buckets[3].count += 1;
  }

  return buckets;
}

function buildStaffRows(leads: AnalyticsLead[], staff: AnalyticsStaffMember[]) {
  return staff.map((member) => {
    const assigned = leads.filter((lead) => lead.assignedTo === member.id);
    const replied = assigned.filter((lead) => Boolean(lead.firstHumanResponseAt));
    const slaMet = replied.filter(
      (lead) =>
        lead.firstHumanResponseAt &&
        minutesBetween(lead.firstMessageAt, lead.firstHumanResponseAt) <= 15,
    );

    return {
      assigned: assigned.length,
      name: member.name,
      replied: replied.length,
      slaMet: percent(slaMet.length, assigned.length),
    };
  });
}

export function AnalyticsDashboard({
  leads,
  staff,
}: {
  leads: AnalyticsLead[];
  staff: AnalyticsStaffMember[];
}) {
  const [range, setRange] = useState<RangeKey>("7d");
  const scopedLeads = useMemo(() => filterLeads(leads, range), [leads, range]);
  const lineData = useMemo(() => buildLineData(leads, range), [leads, range]);
  const distribution = useMemo(() => buildDistribution(scopedLeads), [scopedLeads]);
  const staffRows = useMemo(() => buildStaffRows(scopedLeads, staff), [scopedLeads, staff]);
  const replied = scopedLeads.filter((lead) => Boolean(lead.firstHumanResponseAt));
  const responseMinutes = replied.map((lead) =>
    minutesBetween(lead.firstMessageAt, lead.firstHumanResponseAt ?? lead.firstMessageAt),
  );
  const avgResponse = responseMinutes.length
    ? responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length
    : 0;
  const booked = scopedLeads.filter((lead) => lead.status === "booked").length;

  return (
    <section className="ddr-analytics-page" aria-label="Dashboard analytics">
      <div className="ddr-page-heading">
        <div>
          <span className="ddr-badge ddr-badge-info">Analytics</span>
          <h1>Reception performance</h1>
          <p>Track inquiry volume, response discipline, booked appointments, and staff SLA coverage.</p>
        </div>
        <label className="ddr-range-picker" htmlFor="analytics-range">
          <CalendarDays size={15} />
          <select
            id="analytics-range"
            onChange={(event) => setRange(event.target.value as RangeKey)}
            value={range}
          >
            {ranges.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ddr-kpi-grid">
        {[
          {
            icon: Inbox,
            label: "Total inquiries",
            value: String(scopedLeads.length),
            delta: "+12%",
            tone: "ok",
            points: "2,8 18,16 34,11 50,22 66,9 82,18 98,8",
          },
          {
            icon: TrendingUp,
            label: "Response rate",
            value: percent(replied.length, scopedLeads.length),
            delta: "+8%",
            tone: "ok",
            points: "2,28 18,22 34,18 50,16 66,12 82,10 98,6",
          },
          {
            icon: Clock3,
            label: "Avg response time",
            value: formatMinutes(avgResponse),
            delta: "-23%",
            tone: "alert",
            points: "2,8 18,11 34,15 50,18 66,21 82,25 98,28",
          },
          {
            icon: UserCheck,
            label: "Appointments booked",
            value: String(booked),
            delta: "+15%",
            tone: "ok",
            points: "2,26 18,19 34,24 50,15 66,14 82,10 98,7",
          },
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="ddr-card ddr-kpi-card" key={metric.label}>
              <div className="ddr-kpi-topline">
                <span className="ddr-feature-icon">
                  <Icon size={17} />
                </span>
                <span className={`ddr-badge ${metric.tone === "ok" ? "ddr-badge-ok" : "ddr-badge-alert"}`}>
                  {metric.delta}
                </span>
              </div>
              <span className="ddr-kpi-label">{metric.label}</span>
              <strong className="ddr-kpi-value">{metric.value}</strong>
              <svg className="ddr-sparkline" viewBox="0 0 100 34" aria-hidden="true">
                <polyline points={metric.points} />
              </svg>
            </article>
          );
        })}
      </div>

      <div className="ddr-chart-grid">
        <article className="ddr-card ddr-chart-card wide">
          <div className="ddr-card-heading">
            <h2>Inquiries over time</h2>
            <p>By channel, based on first patient message date.</p>
          </div>
          <div className="ddr-chart-frame">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Line type="monotone" dataKey="WhatsApp" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Instagram" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Telegram" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Web" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="ddr-card ddr-chart-card">
          <div className="ddr-card-heading">
            <h2>Response time distribution</h2>
            <p>Bucketed by first human reply.</p>
          </div>
          <div className="ddr-chart-frame">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribution}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="ddr-card ddr-staff-table-card">
        <div className="ddr-card-heading">
          <h2>Staff performance</h2>
          <p>Assigned conversations, replied threads, and SLA met rate for the selected range.</p>
        </div>
        <div className="ddr-table-wrap">
          <table className="ddr-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Assigned</th>
                <th>Replied</th>
                <th>SLA met</th>
              </tr>
            </thead>
            <tbody>
              {staffRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.assigned}</td>
                  <td>{row.replied}</td>
                  <td>{row.slaMet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
