export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const navItems: NavItem[] = [
  { label: "لوحة التحكم", href: "/dashboard", icon: "layout-dashboard" },
  { label: "العملاء", href: "/customers", icon: "users" },
  { label: "الفرص البيعية", href: "/deals", icon: "handshake" },
  { label: "التقارير", href: "/reports", icon: "bar-chart-3" },
];
