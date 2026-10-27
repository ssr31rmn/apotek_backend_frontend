"use client";

import { useEffect, useState } from "react";
import {
  AuthUser,
  currentUser,
  downloadPdfFile,
  RiwayatItem,
  RiwayatResponse,
  transaksiLaporanPdfUrl,
  transaksiPdfUrl,
  transaksiRiwayat,
} from "@/lib/api";
import { Icon } from "@/components/icon";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LaporanView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tanggalMulai, setTanggalMulai] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [tanggalSelesai, setTanggalSelesai] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RiwayatItem[]>([]);
  const [stats, setStats] = useState<RiwayatResponse["stats"]>({
    total_hari_ini: 0,
    jumlah_hari_ini: 0,
    apotek: "",
  });
  const [meta, setMeta] = useState<RiwayatResponse["meta"]>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });
  const [downloading, setDownloading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RiwayatItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    currentUser().then((u) => setUser(u ?? null));
    void loadData(1);
  }, []);

  async function loadData(page = 1) {
    setLoading(true);
    setError("");
    try {
      const res = await transaksiRiwayat({
        search: search.trim() || undefined,
        tanggalMulai: tanggalMulai || undefined,
        tanggalSelesai: tanggalSelesai || undefined,
        page,
        perPage: 15,
      });
      setData(res.data);
      setStats(res.stats);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportRangePdf() {
    setDownloading(true);
    setError("");
    try {
      const url = transaksiLaporanPdfUrl(tanggalMulai, tanggalSelesai);
      await downloadPdfFile(
        url,
        `laporan-penjualan-${tanggalMulai}-sampai-${tanggalSelesai}.pdf`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh PDF.");
    } finally {
      setDownloading(false);
    }
  }

  const grandTotalPeriode = data.reduce((acc, curr) => acc + curr.total, 0);
  const totalItemPeriode = data.reduce((acc, curr) => acc + curr.total_item, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Laporan Penjualan Cabang
            </h2>
            {user?.apotek && (
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
                {user.apotek}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekap transaksi penjualan & unduh laporan berkas PDF resmi
          </p>
        </div>

        <button
          type="button"
          disabled={downloading}
          onClick={handleExportRangePdf}
          className="h-10 flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-bold text-white shadow-sm hover:bg-teal-800 transition disabled:opacity-50"
        >
          {downloading ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Mengunduh...</span>
            </>
          ) : (
            <>
              <Icon name="download" size={15} />
              <span>Unduh PDF Periode Terpilih</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Transaksi Hari Ini
          </span>
          <p className="mt-2 text-2xl font-black text-teal-800">
            {formatRupiah(stats.total_hari_ini)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.jumlah_hari_ini} transaksi berlangsung hari ini
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Halaman Ini
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatRupiah(grandTotalPeriode)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Dari {data.length} transaksi yang ditampilkan
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Item Terjual
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {totalItemPeriode}{" "}
            <span className="text-sm font-semibold text-slate-500">item</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Kuantitas obat terakumulasi
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Cari Transaksi
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="No. Faktur, Kasir, atau Pelanggan..."
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={tanggalMulai}
            onChange={(e) => setTanggalMulai(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={tanggalSelesai}
            onChange={(e) => setTanggalSelesai(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => void loadData(1)}
          className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition"
        >
          Filter Laporan
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            <p className="mt-3 text-sm font-semibold">Memuat rekapitulasi penjualan...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Icon name="report" size={26} />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">
              Tidak ada transaksi ditemukan
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Coba sesuaikan filter rentang tanggal atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 font-bold">No Faktur</th>
                  <th className="px-5 py-3.5 font-bold">Tanggal</th>
                  <th className="px-5 py-3.5 font-bold">Kasir</th>
                  <th className="px-5 py-3.5 font-bold">Pelanggan</th>
                  <th className="px-5 py-3.5 font-bold text-center">Item</th>
                  <th className="px-5 py-3.5 font-bold">Metode</th>
                  <th className="px-5 py-3.5 font-bold text-right">Total Transaksi</th>
                  <th className="px-5 py-3.5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-mono font-bold text-xs text-slate-900">
                      {item.no_faktur}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {item.tanggal_penjualan}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-800">
                      {item.kasir}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {item.nama_pelanggan || "-"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {item.total_item} item
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-teal-800">
                      {item.metode_pembayaran}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-slate-900">
                      {formatRupiah(item.total)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = transaksiPdfUrl(item.id);
                            void downloadPdfFile(url, `struk-${item.no_faktur}.pdf`);
                          }}
                          className="rounded-lg bg-teal-50 border border-teal-200 px-2 py-1 text-xs font-bold text-teal-800 hover:bg-teal-100"
                          title="Unduh Struk PDF"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Halaman {meta.current_page} dari {meta.last_page} (Total {meta.total} transaksi)
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={meta.current_page <= 1}
                onClick={() => void loadData(meta.current_page - 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => void loadData(meta.current_page + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700">
                  {selectedItem.no_faktur}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Transaksi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Tanggal
                  </span>
                  <p className="font-semibold">{selectedItem.tanggal_penjualan}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Kasir
                  </span>
                  <p className="font-semibold">{selectedItem.kasir}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Pelanggan
                  </span>
                  <p className="font-semibold">{selectedItem.nama_pelanggan || "Umum"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Metode
                  </span>
                  <p className="font-semibold text-teal-800">{selectedItem.metode_pembayaran}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                {selectedItem.rincian.map((r) => (
                  <div key={r.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{r.nama_obat}</p>
                      <p className="text-[11px] text-slate-500">
                        {r.jumlah} {r.satuan} &times; {formatRupiah(r.harga_jual)}
                      </p>
                    </div>
                    <span className="font-bold">{formatRupiah(r.subtotal)}</span>
                  </div>
                ))}
                <div className="p-3 bg-slate-50 flex justify-between items-center font-bold text-sm">
                  <span>Total</span>
                  <span className="text-teal-800">{formatRupiah(selectedItem.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = transaksiPdfUrl(selectedItem.id);
                  void downloadPdfFile(url, `struk-${selectedItem.no_faktur}.pdf`);
                }}
                className="flex-1 h-10 rounded-xl bg-teal-700 text-xs font-bold text-white hover:bg-teal-800 transition"
              >
                Unduh PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
