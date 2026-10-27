"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";
import { Icon } from "@/components/icon";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        aria-label="Tutup navigasi"
        className={`fixed inset-0 z-30 bg-slate-950/35 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
            <span className="text-xl font-semibold">+</span>
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-slate-950">
              Apotek Kita
            </p>
            <p className="text-xs text-slate-500">Sistem Informasi Apotek</p>
          </div>
          <button
            className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="px-6 pt-7 pb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Menu utama
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Navigasi utama">
          {navigationItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors ${active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-teal-600" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-800">
              Mode tampilan
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Navigasi dan data akan terhubung ke Laravel API pada tahap
              berikutnya.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
