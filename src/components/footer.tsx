import Link from "next/link";

const cols = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Security", href: "/security" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#1b1c1e]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-10 justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-3 max-w-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#8ab4f8] flex items-center justify-center">
                <span className="text-[#0f1011] text-xs font-bold">D</span>
              </div>
              <span className="text-[#f1f3f4] font-semibold text-sm">Dash Dental</span>
            </div>
            <p className="text-[#a7adb5] text-sm leading-relaxed">
              Missed-message recovery for dental clinics. One queue, every channel.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-10">
            {cols.map((col) => (
              <div key={col.heading} className="flex flex-col gap-3">
                <span className="text-[#f1f3f4] text-xs font-semibold uppercase tracking-widest">{col.heading}</span>
                <div className="flex flex-col gap-2">
                  {col.links.map((l) => (
                    <Link key={l.href} href={l.href} className="text-[#a7adb5] text-sm hover:text-[#f1f3f4] transition-colors">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[#a7adb5] text-xs">&copy; {new Date().getFullYear()} Dash Dental. All rights reserved.</span>
          <span className="text-[#a7adb5] text-xs">HIPAA-aware &middot; SOC 2 in progress</span>
        </div>
      </div>
    </footer>
  );
}
