export type NavigationItem = {
  label: string;
  href: string;
  icon:
    | "dashboard"
    | "medicine"
    | "category"
    | "batch"
    | "users"
    | "cart"
    | "report";
};

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Manajemen Obat", href: "/obat", icon: "medicine" },
  { label: "Kategori Obat", href: "/kategori", icon: "category" },
  { label: "Batch Obat", href: "/batch-obat", icon: "batch" },
  { label: "Manajemen User", href: "/users", icon: "users" },
  { label: "Transaksi", href: "/transaksi", icon: "cart" },
  { label: "Laporan", href: "/laporan", icon: "report" },
];
