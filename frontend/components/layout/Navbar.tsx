"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LayoutDashboard, Settings, ChevronRight } from "lucide-react";
import { ExpertiseSlider } from "./ExpertiseSlider";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5 h-14">
      <div className="h-full flex items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold gradient-text hidden sm:block">ModelMind AI</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/dashboard">
            <Button
              variant={pathname.startsWith("/dashboard") ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5 text-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Button>
          </Link>
          <Link href="/settings">
            <Button
              variant={pathname === "/settings" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Button>
          </Link>
        </nav>

        {/* Expertise Slider */}
        <ExpertiseSlider />
      </div>
    </header>
  );
}
