"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  Ticket,
  MessageCircle,
  Handshake,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { navItems } from "@/lib/constants/sidebar";

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  ticket: Ticket,
  "message-circle": MessageCircle,
  handshake: Handshake,
  "bar-chart-3": BarChart3,
};

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "fixed md:inset-s-0 inset-y-0 h-screen z-50 md:flex flex-col transition-all duration-300 ease-in-out shadow-sm bg-white border-e border-primary-light",
        collapsed ? "translate-x-full md:translate-x-0 md:w-20" : "translate-x-0 md:w-66"
      )}
    >
      {!collapsed && (
        <div className="flex items-center justify-center p-2 bg-surface h-[67.25px] border-b border-white/10">
          <Image src="/images/logo.svg" alt="Azm CRM" width={160} height={40} />
        </div>
      )}

      <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
        {navItems.map(({ label, href, icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const IconComponent = ICONS[icon] ?? LayoutDashboard;

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "sidebar-link group relative",
                active ? "active" : "inactive",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? label : undefined}
            >
              {!collapsed && (
                <div
                  className={clsx(
                    "absolute inset-s-0 inset-y-1/2 -translate-y-1/2 group-hover:block w-1.5 h-7 rounded-full",
                    active ? "bg-primary block" : "bg-gray-400 hidden"
                  )}
                />
              )}
              <IconComponent size={20} className="shrink-0" />
              {!collapsed && <span className="text-right flex-1">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
