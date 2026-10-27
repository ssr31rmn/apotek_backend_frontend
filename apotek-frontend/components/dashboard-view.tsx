"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PlaceholderPanel, StatusBadge } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { DashboardData, dashboardData } from "@/lib/api";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardView() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    dashboardData()
      .then((res) => {
        if (!active) return;
        setData(res ?? null);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat data ringkasan dashboard.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = data?.stats;
  const obatMenipis = data?.perlu_perhatian.obat_menipis ?? [];
  const obatKedaluwarsa = data?.perlu_perhatian.obat_kedaluwarsa ?? [];
  const totalPerhatian = obatMenipis.length + obatKedaluwarsa.length;
  const transaksiTerbaru = data?.transaksi_terbaru ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Ringkasan hari ini"
        title="Dashboard"
        description="Pantau kondisi apotek dan pekerjaan yang perlu ditindaklanjuti."
        action="Transaksi baru"
        actionHref="/transaksi"
      />

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-xs"
        >
          {error}
        </div>
      )}

      {/* Grid 4 Kartu Statistik */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jenis obat"
          value={loading ? "--" : String(stats?.total_obat ?? 0)}
          helper={
            loading
              ? "Memuat data backend..."
              : "Terdaftar aktif di apotek"
          }
          tone="teal"
        />
        <StatCard
          label="Stok menipis"
          value={loading ? "--" : String(stats?.stok_menipis ?? 0)}
          helper={
            loading
              ? "Memeriksa stok..."
              : (stats?.stok_menipis ?? 0) > 0
                ? "Perlu segera ditambah"
                : "Semua stok aman"
          }
          tone="amber"
        />
        <StatCard
          label="Transaksi hari ini"
          value={loading ? "--" : String(stats?.transaksi_hari_ini ?? 0)}
          helper={
            loading
              ? "Memuat transaksi..."
              : `${stats?.transaksi_hari_ini ?? 0} transaksi berhasil`
          }
          tone="slate"
        />
        <StatCard
          label="Penjualan hari ini"
          value={
            loading
              ? "Rp --"
              : formatRupiah(stats?.penjualan_hari_ini ?? 0)
          }
          helper={
            loading
              ? "Menghitung omzet..."
              : "Total pendapatan hari ini"
          }
          tone="red"
        />
      </div>

      {/* Grid 2 Panel Detail */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Panel 1: Perlu Perhatian (Stok Menipis & Kedaluwarsa) */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">Perlu perhatian</h2>
              <p className="mt-1 text-sm text-slate-500">
                Stok dan kedaluwarsa yang perlu diperiksa.
              </p>
            </div>
            {loading ? (
              <StatusBadge label="Memuat..." tone="neutral" />
            ) : totalPerhatian > 0 ? (
              <StatusBadge
                label={`${totalPerhatian} perlu tindakan`}
                tone="warning"
              />
            ) : (
              <StatusBadge label="Semua aman" tone="success" />
            )}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Memuat data monitoring stok dan kedaluwarsa...
              </div>
            ) : totalPerhatian === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                  ✓
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  Kondisi Inventori Aman
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-600">
                  Tidak ada obat dengan stok di bawah batas minimum dan tidak ada obat yang mendekati tanggal kedaluwarsa.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Daftar Stok Menipis */}
                {obatMenipis.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                      <span>Stok di Bawah Batas Minimum</span>
                      <Link
                        href="/obat"
                        className="font-semibold text-teal-700 hover:text-teal-800"
                      >
                        Lihat obat →
                      </Link>
                    </div>
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
                      {obatMenipis.map((obat) => (
                        <li
                          key={`menipis-${obat.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {obat.nama_obat}
                            </p>
                            <p className="text-xs text-slate-500">
                              Kode: {obat.kode_obat} · Min. {obat.stok_minimum}{" "}
                              {obat.satuan}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                              obat.stok < 1
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Sisa {obat.stok} {obat.satuan}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Daftar Mendekati Kedaluwarsa */}
                {obatKedaluwarsa.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                      <span>Kedaluwarsa ≤ 3 Bulan</span>
                      <Link
                        href="/batch-obat"
                        className="font-semibold text-teal-700 hover:text-teal-800"
                      >
                        Lihat batch →
                      </Link>
                    </div>
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
                      {obatKedaluwarsa.map((obat) => (
                        <li
                          key={`ed-${obat.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {obat.nama_obat}
                            </p>
                            <p className="text-xs text-slate-500">
                              Kode: {obat.kode_obat} · Stok {obat.stok}{" "}
                              {obat.satuan}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                              obat.is_expired
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {obat.is_expired
                              ? "Sudah Kedaluwarsa"
                              : `ED: ${obat.tanggal_kadaluarsa}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Panel 2: Transaksi Terbaru */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">Transaksi terbaru</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ringkasan penjualan terakhir.
              </p>
            </div>
            {transaksiTerbaru.length > 0 && (
              <Link
                href="/transaksi"
                className="text-xs font-bold text-teal-700 hover:text-teal-800"
              >
                Lihat transaksi →
              </Link>
            )}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Memuat riwayat transaksi terakhir...
              </div>
            ) : transaksiTerbaru.length === 0 ? (
              <PlaceholderPanel
                title="Belum ada transaksi untuk ditampilkan"
                description="Daftar transaksi akan muncul setelah ada penjualan yang diproses melalui kasir."
              />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
                {transaksiTerbaru.map((trx) => (
                  <li
                    key={trx.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-100/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-bold text-slate-900">
                        {trx.no_faktur}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {trx.kasir} · {trx.tanggal} · {trx.jumlah_item} item
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-slate-900">
                      {formatRupiah(trx.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
