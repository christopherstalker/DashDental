"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 32000, appointments: 280 },
  { month: "Feb", revenue: 38000, appointments: 320 },
  { month: "Mar", revenue: 42000, appointments: 380 },
  { month: "Apr", revenue: 39000, appointments: 350 },
  { month: "May", revenue: 45000, appointments: 410 },
  { month: "Jun", revenue: 48200, appointments: 440 },
];

const appointmentTypeData = [
  { type: "Cleaning", count: 145 },
  { type: "Filling", count: 89 },
  { type: "Root Canal", count: 34 },
  { type: "Crown", count: 52 },
  { type: "Consultation", count: 78 },
  { type: "Extraction", count: 28 },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm text-muted-foreground"
            style={{ color: entry.color }}
          >
            {entry.dataKey === "revenue"
              ? `$${entry.value.toLocaleString()}`
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-primary">{payload[0].value} appointments</p>
      </div>
    );
  }
  return null;
}

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Revenue Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            Revenue Overview
          </h3>
          <p className="text-sm text-muted-foreground">
            Monthly revenue for the past 6 months
          </p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(0.72 0.18 175)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(0.72 0.18 175)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.25 0.01 260)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.65 0.015 260)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.65 0.015 260)", fontSize: 12 }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="oklch(0.72 0.18 175)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointment Types Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            Appointment Types
          </h3>
          <p className="text-sm text-muted-foreground">
            Distribution by treatment type this month
          </p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={appointmentTypeData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.25 0.01 260)"
                horizontal={false}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.65 0.015 260)", fontSize: 12 }}
              />
              <YAxis
                dataKey="type"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.65 0.015 260)", fontSize: 12 }}
                width={85}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "oklch(0.18 0.01 260)" }} />
              <Bar
                dataKey="count"
                fill="oklch(0.72 0.18 175)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
