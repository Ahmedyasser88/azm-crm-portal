export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const navItems: NavItem[] = [
  { label: "لوحة التحكم", href: "/dashboard", icon: "layout-dashboard" },
  { label: "العملاء", href: "/customers", icon: "users" },
  { label: "التذاكر", href: "/tickets", icon: "ticket" },
  { label: "المحادثات", href: "/conversations", icon: "message-circle" },
  { label: "الفرص البيعية", href: "/deals", icon: "handshake" },
  { label: "التقارير", href: "/reports", icon: "bar-chart-3" },
  { label: "الأتمتة وضمان الخدمة", href: "/automation", icon: "shield-alert" },
  { label: "قاعدة المعرفة", href: "/knowledge-base", icon: "book-open" },
];
