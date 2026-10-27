"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AuthUser,
  currentUser,
  Kategori,
  kategoriCreate,
  kategoriDelete,
  kategoriList,
  kategoriUpdate,
} from "@/lib/api";
import { StatusBadge } from "@/components/ui";

export function KategoriManager() {
  const [items, setItems] = useState<Kategori[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isKasir =
    user?.role?.startsWith("kasir") ||
    user?.roles?.some((r) => r.startsWith("kasir"));
  const canManage = user
    ? (user.permissions?.includes("kategori.kelola") ?? !isKasir)
    : true;

  async function loadCategories() {
    try {
      setItems(await kategoriList());
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Kategori gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadCategories());
    currentUser()
      .then((u) => setUser(u ?? null))
      .catch(() => setUser(null));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editingId) {
        await kategoriUpdate(editingId, cleanName);
        setSuccess("Kategori berhasil diperbarui.");
      } else {
        await kategoriCreate(cleanName);
        setSuccess("Kategori berhasil ditambahkan.");
      }
      setName("");
      setEditingId(null);
      await loadCategories();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Kategori gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Kategori) {
    if (!window.confirm(`Hapus kategori “${item.nama_kategori}”?`)) return;

    setDeletingId(item.id_kategori);
    setError("");
    setSuccess("");
    try {
      await kategoriDelete(item.id_kategori);
      setSuccess("Kategori berhasil dihapus.");
      await loadCategories();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Kategori gagal dihapus.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(item: Kategori) {
    setEditingId(item.id_kategori);
    setName(item.nama_kategori);
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-slate-950">
              {editingId ? "Ubah kategori" : "Tambah kategori"}
            </h2>
            <p className="text-sm text-slate-500">
              Gunakan nama yang singkat dan mudah dikenali saat memilih obat.
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <label className="flex-1">
              <span className="sr-only">Nama kategori</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                required
                placeholder="Contoh: Obat Bebas"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="h-12 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan perubahan"
                  : "Tambah kategori"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="h-12 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
            )}
          </form>
          {error && (
            <p
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
          {success && (
            <p
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              role="status"
            >
              {success}
            </p>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-bold text-slate-950">Daftar kategori</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Memuat data..."
                : `${items.length} kategori terdaftar`}
            </p>
          </div>
          <StatusBadge label="Data Laravel" tone="success" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">ID</th>
                <th className="px-5 py-3 sm:px-6">Nama kategori</th>
                <th className="px-5 py-3 text-right sm:px-6">Jumlah obat</th>
                {canManage && <th className="px-5 py-3 text-right sm:px-6">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id_kategori} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-slate-500 sm:px-6">
                    {item.id_kategori}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900 sm:px-6">
                    {item.nama_kategori}
                  </td>
                  <td className="px-5 py-4 text-right text-slate-600 sm:px-6">
                    {item.obat_count} obat
                  </td>
                  {canManage && (
                    <td className="px-5 py-4 text-right sm:px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:border-teal-400 hover:text-teal-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id_kategori}
                          onClick={() => handleDelete(item)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === item.id_kategori
                            ? "Menghapus..."
                            : "Hapus"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-5 py-14 text-center text-slate-500"
                  >
                    Belum ada kategori.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
