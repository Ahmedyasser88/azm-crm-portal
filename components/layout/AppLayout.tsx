"use client";
import { useAtom } from "jotai";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { clsx } from "clsx";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { sidebarCollapsedAtom } from "@/app/atoms";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar collapsed={collapsed} />
      {!collapsed && (
        <div
          className="md:hidden bg-black opacity-30 fixed z-40 inset-0"
          onClick={() => setCollapsed(true)}
        />
      )}
      <div
        className={clsx(
          "flex-1 min-w-0 flex flex-col transition-all duration-300",
          collapsed ? "md:ms-20" : "md:ms-64"
        )}
      >
        <Header onToggle={() => setCollapsed(!collapsed)} />
        <main className="p-4 lg:py-6 lg:px-16">
          <Breadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}
