"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  { label: "About", href: "/about" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0f1011]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#8ab4f8] flex items-center justify-center">
            <span className="text-[#0f1011] text-xs font-bold">D</span>
          </div>
          <span className="text-[#f1f3f4] font-semibold text-sm tracking-tight">Dash Dental</span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname === l.href
                  ? "text-[#f1f3f4] bg-white/[0.08]"
                  : "text-[#a7adb5] hover:text-[#f1f3f4] hover:bg-white/[0.05]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-1.5 text-sm text-[#a7adb5] hover:text-[#f1f3f4] transition-colors rounded-md hover:bg-white/[0.05]"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 text-sm font-medium bg-[#8ab4f8] text-[#0f1011] rounded-md hover:bg-[#a8c8fa] transition-colors"
          >
            Get started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[#a7adb5] hover:text-[#f1f3f4] p-1"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0f1011] px-6 py-4 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2 text-sm text-[#a7adb5] hover:text-[#f1f3f4] hover:bg-white/[0.05] rounded-md transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-white/[0.06] mt-2 pt-3 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-[#a7adb5] hover:text-[#f1f3f4] rounded-md">Sign in</Link>
            <Link href="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium bg-[#8ab4f8] text-[#0f1011] rounded-md text-center">Get started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
