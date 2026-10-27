"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Icon } from "@/components/icon";
import {
  AuthUser,
  currentUser,
  Kategori,
  kategoriList,
  Obat,
  obatCreate,
  obatDelete,
  ObatInput,
  obatList,
  ObatMeta,
  obatUpdate,
} from "@/lib/api";
import { StatusBadge } from "@/components/ui";

type SortKey = "kode" | "nama" | "stok" | "kategori" | "satuan" | "harga_jual";

const emptyMeta: ObatMeta = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
  filters: { kategori: [], satuan: [] },
  sort: "kode",
  direction: "asc",
};

const initialFormData: ObatInput = {
  kode_obat: "",
  nama_obat: "",
  kategori_id: null,
  satuan: "Strip",
  harga_beli: 0,
  harga_jual: 0,
  stok: 0,
  stok_minimum: 5,
  tanggal_kadaluarsa: "",
  keterangan: "",
};

function formatRupiah(value: string | number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function ObatTable() {
  const [items, setItems] = useState<Obat[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [sort, setSort] = useState<SortKey>("kode");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingObat, setEditingObat] = useState<Obat | null>(null);
  const [detailObat, setDetailObat] = useState<Obat | null>(null);
  const [formData, setFormData] = useState<ObatInput>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const formElementId = useId();

  // Role / Permission: Kasir hanya bisa lihat, Admin bisa kelola (tambah, edit, hapus)
  const isKasir =
    user?.role?.startsWith("kasir") ||
    user?.roles?.some((r) => r.startsWith("kasir"));
  const canManage = user
    ? (user.permissions?.includes("obat.kelola") ?? !isKasir)
    : true;

  // Load User Info
  useEffect(() => {
    currentUser()
      .then((u) => setUser(u ?? null))
      .catch(() => setUser(null));
  }, []);

  // Load Category options for dropdown
  useEffect(() => {
    kategoriList()
      .then((data) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  // Fetch medicines list
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await obatList({
        search,
        kategoriId: category,
        satuan: unit,
        sort,
        direction,
        page,
      });
      setError("");
      setItems(response.data);
      setMeta(response.meta);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Data obat gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, category, unit, sort, direction, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function changeSort(value: string) {
    const [nextSort, nextDirection] = value.split("|") as [
      SortKey,
      "asc" | "desc",
    ];
    setSort(nextSort);
    setDirection(nextDirection);
    setPage(1);
  }

  function openCreateModal() {
    setEditingObat(null);
    setFormData({
      ...initialFormData,
      kategori_id: categories[0]?.id_kategori ?? null,
    });
    setFormError("");
    setIsFormOpen(true);
  }

  function openEditModal(obat: Obat) {
    setEditingObat(obat);
    setFormData({
      kode_obat: obat.kode_obat,
      nama_obat: obat.nama_obat,
      kategori_id: obat.kategori?.id ?? null,
      satuan: obat.satuan,
      harga_beli: Number(obat.harga_beli) || 0,
      harga_jual: Number(obat.harga_jual) || 0,
      stok: obat.stok,
      stok_minimum: obat.stok_minimum,
      tanggal_kadaluarsa: obat.tanggal_kadaluarsa ?? "",
      keterangan: obat.keterangan ?? "",
    });
    setFormError("");
    setIsFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      if (editingObat) {
        await obatUpdate(editingObat.id, formData);
        setSuccess(`Obat "${formData.nama_obat}" berhasil diperbarui.`);
      } else {
        await obatCreate(formData);
        setSuccess(`Obat "${formData.nama_obat}" berhasil ditambahkan.`);
      }

      setIsFormOpen(false);
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan data obat. Periksa kembali isian form.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(obat: Obat) {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus obat "${obat.nama_obat}" (${obat.kode_obat})?`,
      )
    ) {
      return;
    }

    setDeletingId(obat.id);
    setError("");
    try {
      await obatDelete(obat.id);
      setSuccess(`Obat "${obat.nama_obat}" berhasil dihapus.`);
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menghapus data obat.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm"
        >
          {success}
        </div>
      )}

      {/* Main Table Container */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header & Action Toolbar */}
        <div className="space-y-4 border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Icon name="search" size={19} />
              </span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari kode obat, nama obat, atau kategori..."
                className="h-12 w-full rounded-xl border border-slate-300 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              />
            </div>

            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
              >
                <Icon name="plus" size={18} />
                <span>Tambah Obat</span>
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={`${sort}|${direction}`}
              onChange={(event) => changeSort(event.target.value)}
              aria-label="Urutkan obat"
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            >
              <option value="kode|asc">Kode obat (A-Z)</option>
              <option value="kode|desc">Kode obat (Z-A)</option>
              <option value="nama|asc">Nama obat (A-Z)</option>
              <option value="nama|desc">Nama obat (Z-A)</option>
              <option value="harga_jual|asc">Harga jual terendah</option>
              <option value="harga_jual|desc">Harga jual tertinggi</option>
              <option value="stok|asc">Stok terendah</option>
              <option value="stok|desc">Stok tertinggi</option>
            </select>

            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              aria-label="Filter kategori obat"
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            >
              <option value="">Semua kategori</option>
              {categories.map((item) => (
                <option key={item.id_kategori} value={item.id_kategori}>
                  {item.nama_kategori}
                </option>
              ))}
            </select>

            <select
              value={unit}
              onChange={(event) => {
                setUnit(event.target.value);
                setPage(1);
              }}
              aria-label="Filter satuan obat"
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            >
              <option value="">Semua satuan</option>
              {meta.filters.satuan.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>
              {loading ? "Memuat data..." : `${meta.total} jenis obat terdaftar`}
            </span>
            {(search || category || unit) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setUnit("");
                  setPage(1);
                }}
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div
            className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Kode</th>
                  <th className="px-5 py-3">Nama Obat</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Satuan</th>
                  <th className="px-5 py-3 text-right">Harga Jual</th>
                  <th className="px-5 py-3 text-right">Stok</th>
                  <th className="px-5 py-3 text-center">Kedaluwarsa</th>
                  <th className="px-5 py-3 text-right sm:px-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const lowStock = item.stok <= item.stok_minimum;
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-teal-800">
                        {item.kode_obat}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {item.nama_obat}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.apotek ?? "Data Apotek"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {item.kategori?.nama ?? "Tanpa Kategori"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">{item.satuan}</td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {formatRupiah(item.harga_jual)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {lowStock ? (
                          <StatusBadge
                            label={`${item.stok} ${item.satuan} · Menipis`}
                            tone="warning"
                          />
                        ) : (
                          <span className="font-medium text-slate-700">
                            {item.stok} {item.satuan}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center text-xs text-slate-600">
                        {item.tanggal_kadaluarsa ? (
                          <span>{item.tanggal_kadaluarsa}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right sm:px-6">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailObat(item)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-teal-500 hover:text-teal-700"
                          >
                            Detail
                          </button>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs hover:border-emerald-500 hover:bg-emerald-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === item.id}
                                onClick={() => handleDelete(item)}
                                className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-xs hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId === item.id ? "..." : "Hapus"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-14 text-center text-slate-500"
                    >
                      Belum ada obat yang sesuai dengan pencarian atau filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm">
          <span className="text-slate-500">
            Halaman {meta.current_page} dari {meta.last_page} ({meta.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= meta.last_page || loading}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {/* Modal Form Tambah / Edit Obat */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingObat ? "Ubah Data Obat" : "Tambah Obat Baru"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingObat
                    ? `Perbarui informasi untuk ${editingObat.nama_obat}`
                    : "Lengkapi data obat yang akan disimpan ke database apotek."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                aria-label="Tutup form modal"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${formElementId}-kode`}
                    className="block font-semibold text-slate-700"
                  >
                    Kode Obat *
                  </label>
                  <input
                    id={`${formElementId}-kode`}
                    required
                    maxLength={20}
                    placeholder="Contoh: OBT001"
                    value={formData.kode_obat}
                    onChange={(e) =>
                      setFormData({ ...formData, kode_obat: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${formElementId}-kategori`}
                    className="block font-semibold text-slate-700"
                  >
                    Kategori Obat
                  </label>
                  <select
                    id={`${formElementId}-kategori`}
                    value={formData.kategori_id ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kategori_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">Pilih Kategori...</option>
                    {categories.map((c) => (
                      <option key={c.id_kategori} value={c.id_kategori}>
                        {c.nama_kategori}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${formElementId}-nama`}
                  className="block font-semibold text-slate-700"
                >
                  Nama Obat *
                </label>
                <input
                  id={`${formElementId}-nama`}
                  required
                  placeholder="Contoh: Paracetamol 500mg"
                  value={formData.nama_obat}
                  onChange={(e) =>
                    setFormData({ ...formData, nama_obat: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor={`${formElementId}-satuan`}
                    className="block font-semibold text-slate-700"
                  >
                    Satuan *
                  </label>
                  <input
                    id={`${formElementId}-satuan`}
                    required
                    placeholder="Strip / Box / Botol"
                    value={formData.satuan}
                    onChange={(e) =>
                      setFormData({ ...formData, satuan: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${formElementId}-stok`}
                    className="block font-semibold text-slate-700"
                  >
                    Stok Saat Ini *
                  </label>
                  <input
                    id={`${formElementId}-stok`}
                    type="number"
                    min="0"
                    required
                    value={formData.stok}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stok: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${formElementId}-stok-min`}
                    className="block font-semibold text-slate-700"
                  >
                    Stok Minimum *
                  </label>
                  <input
                    id={`${formElementId}-stok-min`}
                    type="number"
                    min="0"
                    required
                    value={formData.stok_minimum}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stok_minimum: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${formElementId}-beli`}
                    className="block font-semibold text-slate-700"
                  >
                    Harga Beli (Rp) *
                  </label>
                  <input
                    id={`${formElementId}-beli`}
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={formData.harga_beli}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        harga_beli: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${formElementId}-jual`}
                    className="block font-semibold text-slate-700"
                  >
                    Harga Jual (Rp) *
                  </label>
                  <input
                    id={`${formElementId}-jual`}
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={formData.harga_jual}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        harga_jual: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${formElementId}-ed`}
                  className="block font-semibold text-slate-700"
                >
                  Tanggal Kedaluwarsa
                </label>
                <input
                  id={`${formElementId}-ed`}
                  type="date"
                  value={formData.tanggal_kadaluarsa ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tanggal_kadaluarsa: e.target.value || null,
                    })
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formElementId}-ket`}
                  className="block font-semibold text-slate-700"
                >
                  Keterangan / Aturan Pakai
                </label>
                <textarea
                  id={`${formElementId}-ket`}
                  rows={2}
                  placeholder="Catatan tambahan mengenai obat..."
                  value={formData.keterangan ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, keterangan: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingObat
                      ? "Simpan Perubahan"
                      : "Tambah Obat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Obat */}
      {detailObat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-teal-800">
                  {detailObat.kode_obat}
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {detailObat.nama_obat}
                </h3>
                <p className="text-xs text-slate-500">
                  {detailObat.apotek ?? "Semua Apotek"} •{" "}
                  {detailObat.kategori?.nama ?? "Tanpa Kategori"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailObat(null)}
                aria-label="Tutup modal detail"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5">
                <div>
                  <span className="text-slate-500">Harga Jual:</span>
                  <p className="text-sm font-bold text-slate-900">
                    {formatRupiah(detailObat.harga_jual)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Harga Beli:</span>
                  <p className="text-sm font-bold text-slate-700">
                    {formatRupiah(detailObat.harga_beli)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Stok Saat Ini:</span>
                  <p className="font-semibold text-slate-800">
                    {detailObat.stok} {detailObat.satuan}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Stok Minimum:</span>
                  <p className="font-semibold text-slate-800">
                    {detailObat.stok_minimum} {detailObat.satuan}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-500">Tanggal Kedaluwarsa</span>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {detailObat.tanggal_kadaluarsa ?? "Tidak diatur"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-500">Status Stok</span>
                  <div className="mt-1">
                    {detailObat.stok <= detailObat.stok_minimum ? (
                      <StatusBadge label="Stok Menipis" tone="warning" />
                    ) : (
                      <StatusBadge label="Stok Aman" tone="success" />
                    )}
                  </div>
                </div>
              </div>

              {detailObat.keterangan && (
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <span className="font-medium text-slate-600">Keterangan:</span>
                  <p className="mt-1 leading-relaxed text-slate-800">
                    {detailObat.keterangan}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setDetailObat(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = detailObat;
                    setDetailObat(null);
                    openEditModal(toEdit);
                  }}
                  className="rounded-xl bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800"
                >
                  Edit Obat Ini
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
