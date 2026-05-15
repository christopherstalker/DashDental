"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Home,
  FileText,
  CreditCard,
  Clock,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Sparkles,
  LogOut,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardCharts } from "@/components/dashboard-charts";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Home, current: true },
  { name: "Appointments", href: "/dashboard", icon: Calendar, current: false },
  { name: "Patients", href: "/dashboard", icon: Users, current: false },
  { name: "Treatments", href: "/dashboard", icon: FileText, current: false },
  { name: "Billing", href: "/dashboard", icon: CreditCard, current: false },
  { name: "Analytics", href: "/dashboard", icon: BarChart3, current: false },
  { name: "Settings", href: "/dashboard", icon: Settings, current: false },
];

const stats = [
  {
    name: "Today's Appointments",
    value: "24",
    change: "+12%",
    trend: "up",
    description: "vs yesterday",
  },
  {
    name: "Active Patients",
    value: "1,847",
    change: "+89",
    trend: "up",
    description: "this month",
  },
  {
    name: "Revenue MTD",
    value: "$48.2K",
    change: "+23%",
    trend: "up",
    description: "vs last month",
  },
  {
    name: "No-Show Rate",
    value: "3.2%",
    change: "-0.8%",
    trend: "down",
    description: "vs last month",
  },
];

const upcomingAppointments = [
  {
    id: 1,
    patient: "Sarah Johnson",
    time: "9:00 AM",
    type: "Cleaning",
    status: "confirmed",
    avatar: null,
    initials: "SJ",
  },
  {
    id: 2,
    patient: "Michael Chen",
    time: "9:30 AM",
    type: "Root Canal",
    status: "confirmed",
    avatar: null,
    initials: "MC",
  },
  {
    id: 3,
    patient: "Emily Davis",
    time: "10:00 AM",
    type: "Consultation",
    status: "pending",
    avatar: null,
    initials: "ED",
  },
  {
    id: 4,
    patient: "James Wilson",
    time: "10:30 AM",
    type: "Filling",
    status: "confirmed",
    avatar: null,
    initials: "JW",
  },
  {
    id: 5,
    patient: "Lisa Anderson",
    time: "11:00 AM",
    type: "Crown",
    status: "confirmed",
    avatar: null,
    initials: "LA",
  },
];

const recentActivity = [
  {
    id: 1,
    action: "New patient registered",
    patient: "David Miller",
    time: "5 min ago",
  },
  {
    id: 2,
    action: "Appointment completed",
    patient: "Anna Roberts",
    time: "32 min ago",
  },
  {
    id: 3,
    action: "Payment received",
    patient: "Robert Taylor",
    time: "1 hour ago",
  },
  {
    id: 4,
    action: "Appointment rescheduled",
    patient: "Jennifer Lee",
    time: "2 hours ago",
  },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Sparkles className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">
              Dash Dental
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                item.current
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-4">
            <p className="text-sm font-medium text-sidebar-foreground">
              Upgrade to Pro
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Get advanced analytics and unlimited patients.
            </p>
            <Button size="sm" className="mt-3 w-full">
              Upgrade Now
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-200 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Sparkles className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">
              Dash Dental
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                item.current
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg
              className="h-6 w-6 text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients, appointments..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>

            <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      DR
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium text-foreground">
                      Dr. Rachel Kim
                    </p>
                    <p className="text-xs text-muted-foreground">Admin</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Good morning, Dr. Kim
            </h1>
            <p className="mt-1 text-muted-foreground">
              Here&apos;s what&apos;s happening at your practice today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Export data</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-primary" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-medium text-primary">
                    {stat.change}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stat.description}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <DashboardCharts />

          {/* Bottom Section */}
          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Upcoming Appointments */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Upcoming Appointments
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Today&apos;s schedule
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y divide-border">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={appointment.avatar || ""} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                          {appointment.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.patient}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {appointment.time}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            appointment.status === "confirmed"
                              ? "bg-primary/10 text-primary"
                              : "bg-chart-4/10 text-chart-4"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View patient</DropdownMenuItem>
                          <DropdownMenuItem>Reschedule</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Recent Activity
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Latest updates at your practice
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y divide-border">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {activity.action}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.patient}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
