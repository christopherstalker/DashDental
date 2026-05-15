"use client";

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 24000, target: 28000 },
  { month: "Feb", revenue: 28000, target: 28000 },
  { month: "Mar", revenue: 35000, target: 32000 },
  { month: "Apr", revenue: 32000, target: 30000 },
  { month: "May", revenue: 42000, target: 35000 },
  { month: "Jun", revenue: 48200, target: 40000 },
];

const appointmentData = [
  { type: "Cleaning", count: 234 },
  { type: "Root Canal", count: 189 },
  { type: "Filling", count: 156 },
  { type: "Crown", count: 124 },
  { type: "Consultation", count: 98 },
];

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Revenue Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Revenue Trend
          </h2>
          <p className="text-sm text-muted-foreground">
            Monthly revenue vs target
          </p>
        </div>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={revenueData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--color-primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--color-primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
              <XAxis stroke="hsl(var(--color-muted-foreground))" style={{ fontSize: "12px" }} />
              <YAxis stroke="hsl(var(--color-muted-foreground))" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--color-card))", border: "1px solid hsl(var(--color-border))", borderRadius: "8px" }} />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--color-primary))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Actual Revenue"
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="hsl(var(--color-muted-foreground))"
                fillOpacity={0}
                name="Target Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointment Types Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Appointment Types
          </h2>
          <p className="text-sm text-muted-foreground">
            Distribution this month
          </p>
        </div>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={appointmentData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
              <XAxis type="number" stroke="hsl(var(--color-muted-foreground))" style={{ fontSize: "12px" }} />
              <YAxis type="category" dataKey="type" stroke="hsl(var(--color-muted-foreground))" style={{ fontSize: "12px" }} width={100} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--color-card))", border: "1px solid hsl(var(--color-border))", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="hsl(var(--color-primary))" radius={4} name="Appointments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
