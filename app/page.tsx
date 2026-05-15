"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Sparkles,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "About", href: "#about" },
];

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "AI-powered appointment scheduling that optimizes your daily workflow and reduces no-shows by 40%.",
  },
  {
    icon: Users,
    title: "Patient Management",
    description:
      "Complete patient profiles with treatment history, documents, and automated communication.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Real-time dashboards showing practice performance, revenue trends, and patient retention.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description:
      "Enterprise-grade security with full HIPAA compliance, encrypted data, and audit logs.",
  },
  {
    icon: Zap,
    title: "Instant Sync",
    description:
      "Real-time synchronization across all devices. Your team stays updated instantly.",
  },
  {
    icon: Clock,
    title: "Automated Reminders",
    description:
      "Smart SMS and email reminders that reduce no-shows and keep your schedule full.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "99",
    description: "Perfect for solo practitioners",
    features: [
      "Up to 200 patients",
      "Basic scheduling",
      "Email reminders",
      "Standard support",
    ],
  },
  {
    name: "Professional",
    price: "249",
    description: "For growing practices",
    features: [
      "Unlimited patients",
      "Advanced scheduling",
      "SMS & email reminders",
      "Analytics dashboard",
      "Priority support",
      "Custom branding",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "499",
    description: "For multi-location practices",
    features: [
      "Everything in Professional",
      "Multi-location support",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">
              Dash Dental
            </span>
          </div>

          <div className="hidden md:flex md:items-center md:gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex md:items-center md:gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="space-y-1 px-6 py-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4">
                <Link
                  href="/dashboard"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Button asChild>
                  <Link href="/dashboard">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Now with AI-powered insights
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Modern dental practice{" "}
              <span className="text-primary">management</span>
            </h1>

            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground lg:text-xl">
              Streamline scheduling, patient management, and analytics in one
              powerful platform. Built for dental professionals who demand
              excellence.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/dashboard">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Link href="#features">
                  See Features
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>

          {/* Hero Dashboard Preview */}
          <div className="relative mt-16 lg:mt-24">
            <div className="overflow-hidden rounded-2xl border border-border bg-card/50 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/80" />
                  <div className="h-3 w-3 rounded-full bg-chart-4/80" />
                  <div className="h-3 w-3 rounded-full bg-primary/80" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="mx-auto w-64 rounded-md bg-secondary px-3 py-1 text-center text-xs text-muted-foreground">
                    app.dashdental.com/dashboard
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-6">
                  <p className="text-sm font-medium text-muted-foreground">
                    Today&apos;s Appointments
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">24</p>
                  <p className="mt-1 text-sm text-primary">+12% from yesterday</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Patients
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    1,847
                  </p>
                  <p className="mt-1 text-sm text-primary">+89 this month</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <p className="text-sm font-medium text-muted-foreground">
                    Revenue MTD
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    $48.2K
                  </p>
                  <p className="mt-1 text-sm text-primary">+23% from last month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to run your practice
            </h2>
            <p className="mt-4 text-pretty text-lg text-muted-foreground">
              Powerful features designed specifically for dental professionals.
              No complexity, just results.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/80"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-pretty text-lg text-muted-foreground">
              Choose the plan that fits your practice. All plans include a
              14-day free trial.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-primary bg-card shadow-lg shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full"
                >
                  <Link href="/dashboard">Get Started</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-1/4 -left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
            </div>
            <div className="relative px-6 py-16 text-center sm:px-16 lg:py-24">
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Ready to transform your practice?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
                Join thousands of dental professionals who have streamlined
                their operations with Dash Dental.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="#features">Schedule a Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                Dash Dental
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Dash Dental. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Terms
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
