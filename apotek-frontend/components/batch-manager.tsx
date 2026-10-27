"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/ui";

export type BatchItem = {
  id: number;
  nomor_batch: string;
  kode_obat: string;
  nama_obat: string;
  kategori: string;
  apotek: string;
  tanggal_masuk: string;
  tanggal_kadaluarsa: string;
  stok_awal: number;
  stok_sisa: number;
  satuan: string;
  harga_beli: number;
  supplier: string;
  status: "aman" | "kritis" | "kedaluwarsa";
};

const INITIAL_BATCHES: BatchItem[] = [
  {
    id: 1,
    nomor_batch: "BTC-2026-091",
    kode_obat: "OBT001",
    nama_obat: "Paracetamol 500mg",
    kategori: "Obat Bebas",
    apotek: "Apotek A",
    tanggal_masuk: "2026-08-15",
    tanggal_kadaluarsa: "2026-11-20",
    stok_awal: 120,
    stok_sisa: 34,
    satuan: "Strip",
    harga_beli: 4500,
    supplier: "PT Kimia Farma Trading",
    status: "kritis",
  },
  {
    id: 2,
    nomor_batch: "BTC-2026-104",
    kode_obat: "OBT001",
    nama_obat: "Paracetamol 500mg",
    kategori: "Obat Bebas",
    apotek: "Apotek A",
    tanggal_masuk: "2026-09-02",
    tanggal_kadaluarsa: "2027-08-14",
    stok_awal: 200,
    stok_sisa: 185,
    satuan: "Strip",
    harga_beli: 4600,
    supplier: "PT Kimia Farma Trading",
    status: "aman",
  },
  {
    id: 3,
    nomor_batch: "BTC-2026-042",
    kode_obat: "OBT002",
    nama_obat: "Amoxicillin 500mg",
    kategori: "Antibiotik",
    apotek: "Apotek A",
    tanggal_masuk: "2026-06-10",
    tanggal_kadaluarsa: "2026-10-28",
    stok_awal: 80,
    stok_sisa: 12,
    satuan: "Strip",
    harga_beli: 7200,
    supplier: "PT Kalbe Farma Tbk",
    status: "kritis",
  },
  {
    id: 4,
    nomor_batch: "BTC-2025-882",
    kode_obat: "OBT003",
    nama_obat: "Antasida Doen",
    kategori: "Obat Bebas",
    apotek: "Apotek B",
    tanggal_masuk: "2025-05-12",
    tanggal_kadaluarsa: "2026-09-30",
    stok_awal: 50,
    stok_sisa: 6,
    satuan: "Botol",
    harga_beli: 6000,
    supplier: "PT Sanbe Farma",
    status: "kedaluwarsa",
  },
  {
    id: 5,
    nomor_batch: "BTC-2026-218",
    kode_obat: "OBT004",
    nama_obat: "Cetirizine 10mg",
    kategori: "Obat Keras",
    apotek: "Apotek B",
    tanggal_masuk: "2026-09-18",
    tanggal_kadaluarsa: "2027-12-01",
    stok_awal: 150,
    stok_sisa: 140,
    satuan: "Strip",
    harga_beli: 5500,
    supplier: "PT Dexa Medica",
    status: "aman",
  },
  {
    id: 6,
    nomor_batch: "BTC-2026-302",
    kode_obat: "OBT005",
    nama_obat: "Vitamin C 500mg",
    kategori: "Vitamin",
    apotek: "Apotek A",
    tanggal_masuk: "2026-07-04",
    tanggal_kadaluarsa: "2027-06-18",
    stok_awal: 250,
    stok_sisa: 210,
    satuan: "Botol",
    harga_beli: 18000,
    supplier: "PT Enseval Putera",
    status: "aman",
  },
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BatchManager() {
  const [batches, setBatches] = useState<BatchItem[]>(INITIAL_BATCHES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");
  const [apotekFilter, setApotekFilter] = useState<string>("semua");
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form state untuk modal tambah batch mockup
  const [formData, setFormData] = useState({
    nomor_batch: "",
    nama_obat: "Paracetamol 500mg",
    kode_obat: "OBT001",
    kategori: "Obat Bebas",
    apotek: "Apotek A",
    tanggal_masuk: new Date().toISOString().split("T")[0],
    tanggal_kadaluarsa: "",
    stok_awal: "100",
    satuan: "Strip",
    harga_beli: "5000",
    supplier: "PT Kimia Farma Trading",
  });

  const formBatchId = useId();

  // Filter batch
  const filteredBatches = batches.filter((b) => {
    const matchSearch =
      b.nomor_batch.toLowerCase().includes(search.toLowerCase()) ||
      b.nama_obat.toLowerCase().includes(search.toLowerCase()) ||
      b.kode_obat.toLowerCase().includes(search.toLowerCase()) ||
      b.supplier.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "semua" || b.status === statusFilter;

    const matchApotek =
      apotekFilter === "semua" || b.apotek === apotekFilter;

    return matchSearch && matchStatus && matchApotek;
  });

  // Statistik ringkasan
  const totalBatch = batches.length;
  const batchAman = batches.filter((b) => b.status === "aman").length;
  const batchKritis = batches.filter((b) => b.status === "kritis").length;
  const batchExpired = batches.filter((b) => b.status === "kedaluwarsa").length;

  function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nomor_batch.trim() || !formData.tanggal_kadaluarsa) {
      return;
    }

    const today = new Date();
    const expDate = new Date(formData.tanggal_kadaluarsa);
    const diffDays = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let status: "aman" | "kritis" | "kedaluwarsa" = "aman";
    if (diffDays <= 0) {
      status = "kedaluwarsa";
    } else if (diffDays <= 60) {
      status = "kritis";
    }

    const newBatch: BatchItem = {
      id: Date.now(),
      nomor_batch: formData.nomor_batch.trim().toUpperCase(),
      nama_obat: formData.nama_obat,
      kode_obat: formData.kode_obat,
      kategori: formData.kategori,
      apotek: formData.apotek,
      tanggal_masuk: formData.tanggal_masuk,
      tanggal_kadaluarsa: formData.tanggal_kadaluarsa,
      stok_awal: Number(formData.stok_awal) || 0,
      stok_sisa: Number(formData.stok_awal) || 0,
      satuan: formData.satuan,
      harga_beli: Number(formData.harga_beli) || 0,
      supplier: formData.supplier,
      status,
    };

    setBatches([newBatch, ...batches]);
    setIsCreateOpen(false);
    setFormData({
      nomor_batch: "",
      nama_obat: "Paracetamol 500mg",
      kode_obat: "OBT001",
      kategori: "Obat Bebas",
      apotek: "Apotek A",
      tanggal_masuk: new Date().toISOString().split("T")[0],
      tanggal_kadaluarsa: "",
      stok_awal: "100",
      satuan: "Strip",
      harga_beli: "5000",
      supplier: "PT Kimia Farma Trading",
    });

    setNotification(
      `Mockup berhasil: Batch ${newBatch.nomor_batch} berhasil ditambahkan ke pratinjau!`,
    );
    setTimeout(() => setNotification(null), 4000);
  }

  function handleQuarantine(batch: BatchItem) {
    const updated = batches.map((b) =>
      b.id === batch.id
        ? {
            ...b,
            status:
              b.status === "kedaluwarsa" ? ("aman" as const) : ("kedaluwarsa" as const),
          }
        : b,
    );
    setBatches(updated);
    if (selectedBatch?.id === batch.id) {
      setSelectedBatch({
        ...batch,
        status:
          batch.status === "kedaluwarsa" ? "aman" : "kedaluwarsa",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Mockup Mode */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <Icon name="batch" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-teal-950">
                  Pratinjau Antarmuka: Fitur Batch & FEFO
                </span>
                <span className="rounded-full bg-teal-200 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-teal-900">
                  Mockup UI
                </span>
              </div>
              <p className="mt-1 text-xs text-teal-800 sm:text-sm">
                Struktur UI batch obat siap pakai dengan pelacakan nomor batch, tanggal
                kedaluwarsa (ED), dan prioritas pengeluaran FEFO sebelum integrasi ke backend.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-teal-800"
          >
            <Icon name="plus" size={16} />
            <span>Tambah Batch Mockup</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm"
        >
          {notification}
        </div>
      )}

      {/* Statistik Cepat */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Batch
            </p>
            <span className="rounded-lg bg-teal-50 p-1.5 text-teal-700">
              <Icon name="batch" size={18} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {totalBatch}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Terdaftar di inventori aktif
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Status Aman
            </p>
            <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700">
              ✓
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {batchAman}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            ED &gt; 60 hari mendatang
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kritis (&lt; 60 Hari)
            </p>
            <span className="rounded-lg bg-amber-50 p-1.5 text-amber-700">
              !
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-amber-700">
            {batchKritis}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Prioritas FEFO untuk dijual duluan
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-red-500 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kedaluwarsa / Karantina
            </p>
            <span className="rounded-lg bg-red-50 p-1.5 text-red-700">
              ✕
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-red-600">
            {batchExpired}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Wajib ditarik dari rak display
          </p>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon name="search" size={18} />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor batch, obat, atau supplier..."
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter status batch"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          >
            <option value="semua">Semua Status</option>
            <option value="aman">Aman (&gt; 60 Hari)</option>
            <option value="kritis">Kritis (&lt; 60 Hari)</option>
            <option value="kedaluwarsa">Kedaluwarsa / Retur</option>
          </select>

          {/* Apotek Filter */}
          <select
            value={apotekFilter}
            onChange={(e) => setApotekFilter(e.target.value)}
            aria-label="Filter apotek"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          >
            <option value="semua">Semua Apotek</option>
            <option value="Apotek A">Apotek A</option>
            <option value="Apotek B">Apotek B</option>
          </select>
        </div>
      </div>

      {/* Tabel Batch */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-bold text-slate-950">Daftar Batch Obat</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Menampilkan {filteredBatches.length} dari total {batches.length} batch
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:inline">
              Metode Alur:
            </span>
            <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
              FEFO Priority
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">Nomor Batch</th>
                <th className="px-5 py-3">Nama Obat</th>
                <th className="px-5 py-3">Apotek</th>
                <th className="px-5 py-3">Tgl Masuk</th>
                <th className="px-5 py-3">Tgl Kedaluwarsa (ED)</th>
                <th className="px-5 py-3 text-right">Sisa Stok</th>
                <th className="px-5 py-3 text-center">Status FEFO</th>
                <th className="px-5 py-3 text-right sm:px-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.map((batch) => {
                const stockPercentage = Math.round(
                  (batch.stok_sisa / batch.stok_awal) * 100,
                );

                return (
                  <tr
                    key={batch.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <div className="font-mono text-xs font-bold text-teal-800">
                        {batch.nomor_batch}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {batch.supplier}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {batch.nama_obat}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-mono text-[11px]">
                          {batch.kode_obat}
                        </span>
                        <span>•</span>
                        <span>{batch.kategori}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {batch.apotek}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {batch.tanggal_masuk}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">
                        {batch.tanggal_kadaluarsa}
                      </div>
                      <div className="text-[11px]">
                        {batch.status === "kedaluwarsa" ? (
                          <span className="font-semibold text-red-600">
                            Sudah Kedaluwarsa
                          </span>
                        ) : batch.status === "kritis" ? (
                          <span className="font-semibold text-amber-600">
                            Mendekati ED (&lt; 60 hari)
                          </span>
                        ) : (
                          <span className="text-emerald-600">Aman</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="font-bold text-slate-900">
                        {batch.stok_sisa} / {batch.stok_awal} {batch.satuan}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full ${
                              batch.stok_sisa <= 10
                                ? "bg-red-500"
                                : batch.stok_sisa <= 30
                                  ? "bg-amber-500"
                                  : "bg-teal-600"
                            }`}
                            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {stockPercentage}%
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      {batch.status === "kritis" ? (
                        <StatusBadge label="Prioritas Keluar" tone="warning" />
                      ) : batch.status === "kedaluwarsa" ? (
                        <StatusBadge label="Karantina / Retur" tone="danger" />
                      ) : (
                        <StatusBadge label="Normal" tone="success" />
                      )}
                    </td>

                    <td className="px-5 py-4 text-right sm:px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBatch(batch)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-600 hover:text-teal-700"
                        >
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuarantine(batch)}
                          title="Ubah status karantina"
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
                            batch.status === "kedaluwarsa"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {batch.status === "kedaluwarsa" ? "Aktifkan" : "Karantina"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBatches.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-slate-500"
                  >
                    Tidak ada batch yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Detail Batch */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-mono font-bold text-teal-800">
                  {selectedBatch.nomor_batch}
                </span>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {selectedBatch.nama_obat}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedBatch.kode_obat} • {selectedBatch.kategori}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                aria-label="Tutup modal"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                <div>
                  <span className="text-slate-500">Apotek:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedBatch.apotek}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Supplier:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedBatch.supplier}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Harga Beli Batch:</span>
                  <p className="font-semibold text-slate-800">
                    {formatRupiah(selectedBatch.harga_beli)} / {selectedBatch.satuan}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Total Nilai Batch:</span>
                  <p className="font-semibold text-slate-800">
                    {formatRupiah(selectedBatch.harga_beli * selectedBatch.stok_sisa)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-500">Tanggal Masuk</span>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedBatch.tanggal_masuk}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-500">Tanggal Kedaluwarsa</span>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedBatch.tanggal_kadaluarsa}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Kondisi Stok:</span>
                  <span className="font-bold text-slate-900">
                    {selectedBatch.stok_sisa} dari {selectedBatch.stok_awal} {selectedBatch.satuan}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-teal-600"
                    style={{
                      width: `${Math.round(
                        (selectedBatch.stok_sisa / selectedBatch.stok_awal) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-bold">Rekomendasi Sistem (FEFO):</p>
                <p className="mt-0.5">
                  {selectedBatch.status === "kritis"
                    ? "Batch ini harus diletakkan paling depan di etalase/rak kasir agar terjual terlebih dahulu."
                    : selectedBatch.status === "kedaluwarsa"
                      ? "Peringatan: Batch sudah melewati tanggal kedaluwarsa. Jangan dijual ke konsumen!"
                      : "Batch dalam kondisi prima dan aman untuk disimpan sebagai stok cadangan."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(
                    `Simulasi Mockup: Label Barcode Batch ${selectedBatch.nomor_batch} siap dicetak.`,
                  );
                }}
                className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800"
              >
                Cetak Barcode Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Batch Mockup */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Tambah Batch Baru (Mockup)
                </h3>
                <p className="text-xs text-slate-500">
                  Simulasi penambahan batch obat baru untuk pengujian tampilan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Tutup form"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label
                  htmlFor={`${formBatchId}-nomor`}
                  className="block font-semibold text-slate-700"
                >
                  Nomor Batch *
                </label>
                <input
                  id={`${formBatchId}-nomor`}
                  required
                  placeholder="Contoh: BTC-2026-999"
                  value={formData.nomor_batch}
                  onChange={(e) =>
                    setFormData({ ...formData, nomor_batch: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${formBatchId}-obat`}
                    className="block font-semibold text-slate-700"
                  >
                    Pilih Obat
                  </label>
                  <select
                    id={`${formBatchId}-obat`}
                    value={formData.nama_obat}
                    onChange={(e) => {
                      const val = e.target.value;
                      let kode = "OBT001";
                      let kat = "Obat Bebas";
                      if (val.includes("Amoxicillin")) {
                        kode = "OBT002";
                        kat = "Antibiotik";
                      } else if (val.includes("Cetirizine")) {
                        kode = "OBT004";
                        kat = "Obat Keras";
                      } else if (val.includes("Vitamin")) {
                        kode = "OBT005";
                        kat = "Vitamin";
                      }
                      setFormData({
                        ...formData,
                        nama_obat: val,
                        kode_obat: kode,
                        kategori: kat,
                      });
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="Paracetamol 500mg">Paracetamol 500mg</option>
                    <option value="Amoxicillin 500mg">Amoxicillin 500mg</option>
                    <option value="Cetirizine 10mg">Cetirizine 10mg</option>
                    <option value="Vitamin C 500mg">Vitamin C 500mg</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${formBatchId}-apotek`}
                    className="block font-semibold text-slate-700"
                  >
                    Lokasi Apotek
                  </label>
                  <select
                    id={`${formBatchId}-apotek`}
                    value={formData.apotek}
                    onChange={(e) =>
                      setFormData({ ...formData, apotek: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="Apotek A">Apotek A</option>
                    <option value="Apotek B">Apotek B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${formBatchId}-tgl-masuk`}
                    className="block font-semibold text-slate-700"
                  >
                    Tanggal Masuk
                  </label>
                  <input
                    id={`${formBatchId}-tgl-masuk`}
                    type="date"
                    required
                    value={formData.tanggal_masuk}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_masuk: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${formBatchId}-tgl-kadaluarsa`}
                    className="block font-semibold text-slate-700"
                  >
                    Tanggal Kedaluwarsa (ED) *
                  </label>
                  <input
                    id={`${formBatchId}-tgl-kadaluarsa`}
                    type="date"
                    required
                    value={formData.tanggal_kadaluarsa}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_kadaluarsa: e.target.value,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${formBatchId}-stok`}
                    className="block font-semibold text-slate-700"
                  >
                    Jumlah Stok Awal
                  </label>
                  <input
                    id={`${formBatchId}-stok`}
                    type="number"
                    min="1"
                    required
                    value={formData.stok_awal}
                    onChange={(e) =>
                      setFormData({ ...formData, stok_awal: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${formBatchId}-satuan`}
                    className="block font-semibold text-slate-700"
                  >
                    Satuan
                  </label>
                  <select
                    id={`${formBatchId}-satuan`}
                    value={formData.satuan}
                    onChange={(e) =>
                      setFormData({ ...formData, satuan: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="Strip">Strip</option>
                    <option value="Box">Box</option>
                    <option value="Botol">Botol</option>
                    <option value="Tablet">Tablet</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${formBatchId}-supplier`}
                  className="block font-semibold text-slate-700"
                >
                  Distributor / PBF
                </label>
                <input
                  id={`${formBatchId}-supplier`}
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white hover:bg-teal-800"
                >
                  Simpan Batch Mockup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
