"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AuthUser,
  currentUser,
  downloadPdfFile,
  RiwayatItem,
  RiwayatResponse,
  TransaksiItem,
  TransaksiObat,
  transaksiCheckout,
  transaksiLaporanPdfUrl,
  transaksiObatList,
  transaksiPdfUrl,
  transaksiRiwayat,
} from "@/lib/api";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/ui";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TransaksiView() {
  const [activeTab, setActiveTab] = useState<"pos" | "riwayat">("pos");
  const [user, setUser] = useState<AuthUser | null>(null);

  // POS State
  const [obatList, setObatList] = useState<TransaksiObat[]>([]);
  const [loadingObat, setLoadingObat] = useState(true);
  const [searchObat, setSearchObat] = useState("");
  const [selectedKategori, setSelectedKategori] = useState<string>("all");
  const [cart, setCart] = useState<TransaksiItem[]>([]);
  const [namaPelanggan, setNamaPelanggan] = useState("");
  const [metodePembayaran, setMetodePembayaran] = useState("Tunai");
  const [keterangan, setKeterangan] = useState("");
  const [uangBayar, setUangBayar] = useState<string>("");
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [checkoutSuccessData, setCheckoutSuccessData] = useState<RiwayatItem | null>(null);

  // Riwayat State
  const [riwayatData, setRiwayatData] = useState<RiwayatItem[]>([]);
  const [riwayatStats, setRiwayatStats] = useState<RiwayatResponse["stats"]>({
    total_hari_ini: 0,
    jumlah_hari_ini: 0,
    apotek: "",
  });
  const [riwayatMeta, setRiwayatMeta] = useState<RiwayatResponse["meta"]>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [searchRiwayat, setSearchRiwayat] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [tanggalSelesai, setTanggalSelesai] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [detailModalItem, setDetailModalItem] = useState<RiwayatItem | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<number | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Notification / Alert
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Load User & Initial Data
  useEffect(() => {
    currentUser()
      .then((u) => {
        setUser(u ?? null);
      })
      .catch(() => setUser(null));

    void loadObat();
  }, []);

  useEffect(() => {
    if (activeTab === "riwayat") {
      void loadRiwayat(1);
    }
  }, [activeTab]);

  async function loadObat(query = "") {
    setLoadingObat(true);
    setErrorMessage("");
    try {
      const res = await transaksiObatList({ search: query });
      setObatList(res.data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal memuat katalog obat untuk apotek ini.",
      );
    } finally {
      setLoadingObat(false);
    }
  }

  async function loadRiwayat(page = 1) {
    setLoadingRiwayat(true);
    setErrorMessage("");
    try {
      const res = await transaksiRiwayat({
        search: searchRiwayat.trim() || undefined,
        tanggalMulai: tanggalMulai || undefined,
        tanggalSelesai: tanggalSelesai || undefined,
        page,
        perPage: 10,
      });
      setRiwayatData(res.data);
      setRiwayatStats(res.stats);
      setRiwayatMeta(res.meta);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memuat riwayat transaksi.",
      );
    } finally {
      setLoadingRiwayat(false);
    }
  }

  // Handle Search Obat with debounce feel
  function handleSearchObat(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchObat(val);
    void loadObat(val);
  }

  // Categories list
  const kategoriOptions = useMemo(() => {
    const map = new Map<string, string>();
    obatList.forEach((o) => {
      if (o.kategori?.nama) {
        map.set(String(o.kategori.id), o.kategori.nama);
      }
    });
    return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }));
  }, [obatList]);

  // Filtered Obat List
  const filteredObatList = useMemo(() => {
    return obatList.filter((obat) => {
      if (selectedKategori === "all") return true;
      return String(obat.kategori?.id) === selectedKategori;
    });
  }, [obatList, selectedKategori]);

  // Cart Helpers
  function getCartQuantity(obatId: number): number {
    const found = cart.find((i) => i.obat.id === obatId);
    return found ? found.jumlah : 0;
  }

  function addToCart(obat: TransaksiObat) {
    const existing = cart.find((i) => i.obat.id === obat.id);
    const currentQty = existing ? existing.jumlah : 0;
    if (currentQty + 1 > obat.stok) {
      setErrorMessage(
        `Stok ${obat.nama_obat} tidak mencukupi. Tersedia: ${obat.stok} ${obat.satuan}.`,
      );
      return;
    }

    setErrorMessage("");
    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.obat.id === obat.id
            ? {
                ...item,
                jumlah: item.jumlah + 1,
                subtotal: (item.jumlah + 1) * item.obat.harga_jual,
              }
            : item,
        ),
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          obat,
          jumlah: 1,
          subtotal: obat.harga_jual,
        },
      ]);
    }

    showToast(`${obat.nama_obat} ditambahkan ke keranjang`);
  }

  function updateQuantity(obatId: number, newQty: number) {
    if (newQty <= 0) {
      removeFromCart(obatId);
      return;
    }

    const item = cart.find((i) => i.obat.id === obatId);
    if (!item) return;

    if (newQty > item.obat.stok) {
      setErrorMessage(
        `Stok ${item.obat.nama_obat} tidak mencukupi. Maksimal: ${item.obat.stok}.`,
      );
      return;
    }

    setErrorMessage("");
    setCart((prev) =>
      prev.map((i) =>
        i.obat.id === obatId
          ? {
              ...i,
              jumlah: newQty,
              subtotal: newQty * i.obat.harga_jual,
            }
          : i,
      ),
    );
  }

  function removeFromCart(obatId: number) {
    setCart((prev) => prev.filter((i) => i.obat.id !== obatId));
  }

  function clearCart() {
    if (cart.length === 0) return;
    if (window.confirm("Kosongkan keranjang belanja?")) {
      setCart([]);
      setUangBayar("");
      setErrorMessage("");
    }
  }

  function showToast(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast((curr) => (curr === msg ? "" : curr));
    }, 2800);
  }

  // Cart Calculations
  const totalItemCount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.jumlah, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.subtotal, 0);
  }, [cart]);

  const numericBayar = useMemo(() => {
    const val = parseFloat(uangBayar.replace(/\D/g, ""));
    return isNaN(val) ? 0 : val;
  }, [uangBayar]);

  const kembalian = useMemo(() => {
    if (metodePembayaran !== "Tunai") return 0;
    return Math.max(0, numericBayar - grandTotal);
  }, [metodePembayaran, numericBayar, grandTotal]);

  const isUnderpaid = useMemo(() => {
    if (metodePembayaran !== "Tunai") return false;
    if (numericBayar === 0 && grandTotal > 0) return true;
    return numericBayar < grandTotal;
  }, [metodePembayaran, numericBayar, grandTotal]);

  // Handle Checkout
  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMessage("Keranjang masih kosong.");
      return;
    }

    if (metodePembayaran === "Tunai" && isUnderpaid) {
      setErrorMessage(
        `Uang pembayaran kurang dari total tagihan (${formatRupiah(grandTotal)}).`,
      );
      return;
    }

    setProcessingCheckout(true);
    setErrorMessage("");

    try {
      const payload = {
        items: cart.map((item) => ({
          obat_id: item.obat.id,
          jumlah: item.jumlah,
        })),
        nama_pelanggan: namaPelanggan.trim() || undefined,
        metode_pembayaran: metodePembayaran,
        keterangan: keterangan.trim() || undefined,
        bayar: metodePembayaran === "Tunai" ? numericBayar : grandTotal,
      };

      const result = await transaksiCheckout(payload);

      if (!result) {
        throw new Error("Respon transaksi kosong.");
      }

      // Convert result to RiwayatItem for receipt view
      const receiptItem: RiwayatItem = {
        id: result.id,
        no_faktur: result.no_faktur,
        nama_pelanggan: result.nama_pelanggan,
        tanggal_penjualan: result.tanggal_penjualan,
        raw_tanggal: new Date().toISOString(),
        kasir: result.kasir,
        apotek: result.apotek,
        metode_pembayaran: result.metode_pembayaran,
        keterangan: result.keterangan,
        total: result.total,
        total_item: result.items.reduce((acc, curr) => acc + curr.jumlah, 0),
        rincian: result.items.map((it, idx) => ({
          id: idx + 1,
          obat_id: it.obat_id,
          nama_obat: it.nama_obat,
          satuan: it.satuan,
          jumlah: it.jumlah,
          harga_jual: it.harga_jual,
          subtotal: it.subtotal,
        })),
      };

      setCheckoutSuccessData(receiptItem);

      // Reset cart and inputs
      setCart([]);
      setNamaPelanggan("");
      setKeterangan("");
      setUangBayar("");

      // Reload obat list to get fresh updated stock
      void loadObat(searchObat);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses checkout.",
      );
    } finally {
      setProcessingCheckout(false);
    }
  }

  // Handle PDF Download
  async function handleDownloadPdf(item: RiwayatItem) {
    setDownloadingPdfId(item.id);
    try {
      const url = transaksiPdfUrl(item.id);
      await downloadPdfFile(url, `struk-${item.no_faktur}.pdf`);
      showToast(`Struk ${item.no_faktur} berhasil diunduh.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal mengunduh file PDF struk.",
      );
    } finally {
      setDownloadingPdfId(null);
    }
  }

  async function handleDownloadReport() {
    setDownloadingReport(true);
    setErrorMessage("");
    try {
      const url = transaksiLaporanPdfUrl(tanggalMulai, tanggalSelesai);
      await downloadPdfFile(
        url,
        `laporan-penjualan-${tanggalMulai}-sampai-${tanggalSelesai}.pdf`,
      );
      showToast("Laporan PDF berhasil diunduh.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal mengunduh laporan PDF.",
      );
    } finally {
      setDownloadingReport(false);
    }
  }

  const userRoleDisplay = useMemo(() => {
    if (!user) return "";
    if (user.role?.startsWith("admin") || user.roles?.some((r) => r.startsWith("admin"))) {
      return "Administrator";
    }
    return "Kasir";
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3">
          <Icon name="check" size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner with Active Branch & User Info */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
            <Icon name="cart" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Sistem Kasir & Transaksi
              </h1>
              {user?.apotek && (
                <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
                  {user.apotek}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Operator: <span className="font-semibold text-slate-700">{user?.name ?? "Kasir"}</span> ({userRoleDisplay}) &middot; Melayani transaksi cabang {user?.apotek ?? "-"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "pos"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon name="cart" size={17} />
            <span>Kasir POS</span>
            {cart.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white">
                {cart.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "riwayat"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon name="history" size={17} />
            <span>Riwayat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 font-bold">
              !
            </span>
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-red-600 hover:text-red-800 text-xs font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* TAB 1: KASIR POS VIEW */}
      {activeTab === "pos" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1.1fr)]">
          {/* LEFT: Medicine Catalog */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Pilih Obat ({filteredObatList.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Katalog khusus cabang {user?.apotek ?? ""}
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Icon name="search" size={16} />
                  </span>
                  <input
                    type="search"
                    value={searchObat}
                    onChange={handleSearchObat}
                    placeholder="Cari nama atau kode obat..."
                    className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-100"
                  />
                </div>
              </div>

              {/* Category Pills */}
              {kategoriOptions.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedKategori("all")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      selectedKategori === "all"
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Semua ({obatList.length})
                  </button>
                  {kategoriOptions.map((kat) => (
                    <button
                      key={kat.id}
                      type="button"
                      onClick={() => setSelectedKategori(kat.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        selectedKategori === kat.id
                          ? "bg-teal-700 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {kat.nama}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Medicine Items Grid */}
            {loadingObat ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
                <p className="mt-3 text-sm font-semibold">Memuat daftar obat {user?.apotek}...</p>
              </div>
            ) : filteredObatList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Icon name="medicine" size={24} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800">
                  Tidak ada obat ditemukan
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {searchObat
                    ? `Tidak ada hasil untuk kata kunci "${searchObat}".`
                    : `Belum ada obat yang terdaftar untuk cabang ${user?.apotek ?? ""}.`}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredObatList.map((obat) => {
                  const inCartQty = getCartQuantity(obat.id);
                  const sisaStok = Math.max(0, obat.stok - inCartQty);
                  const isHabis = sisaStok <= 0;
                  const isMenipis = !isHabis && sisaStok <= obat.stok_minimum;

                  return (
                    <div
                      key={obat.id}
                      className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-4 transition-all hover:shadow-md ${
                        inCartQty > 0
                          ? "border-teal-400 bg-teal-50/20 ring-1 ring-teal-300"
                          : "border-slate-200 hover:border-teal-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {obat.kode_obat}
                          </span>
                          {obat.kategori?.nama && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {obat.kategori.nama}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 font-bold text-slate-900 group-hover:text-teal-700 transition">
                          {obat.nama_obat}
                        </h3>
                        <p className="mt-1 text-base font-extrabold text-teal-800">
                          {formatRupiah(obat.harga_jual)}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / {obat.satuan}
                          </span>
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Stok Tersedia
                          </span>
                          {isHabis ? (
                            <span className="text-xs font-bold text-red-600">
                              Habis
                            </span>
                          ) : isMenipis ? (
                            <span className="text-xs font-bold text-amber-600">
                              Sisa {sisaStok} {obat.satuan}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700">
                              {sisaStok} {obat.satuan}
                            </span>
                          )}
                          {inCartQty > 0 && (
                            <span className="text-[10px] text-teal-700 font-semibold">
                              ({inCartQty} di keranjang)
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isHabis}
                          onClick={() => addToCart(obat)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            isHabis
                              ? "cursor-not-allowed bg-slate-100 text-slate-400"
                              : "bg-teal-700 text-white hover:bg-teal-800 active:scale-95 shadow-sm"
                          }`}
                        >
                          <Icon name="plus" size={14} />
                          <span>Tambah</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Cart & Checkout Panel */}
          <div className="sticky top-24 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-bold">
                    <Icon name="cart" size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Keranjang Kasir
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {totalItemCount} total item ({cart.length} jenis obat)
                    </p>
                  </div>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Icon name="cart" size={26} />
                  </div>
                  <p className="mt-3 font-bold text-slate-800">
                    Keranjang masih kosong
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Pilih obat dari katalog di sebelah kiri untuk memulai transaksi penjualan.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto px-4 py-2">
                  {cart.map((item) => (
                    <div
                      key={item.obat.id}
                      className="py-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {item.obat.nama_obat}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatRupiah(item.obat.harga_jual)} / {item.obat.satuan}
                        </p>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.obat.id, item.jumlah - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                          aria-label="Kurangi"
                        >
                          <Icon name="minus" size={13} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.obat.stok}
                          value={item.jumlah}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              updateQuantity(item.obat.id, val);
                            }
                          }}
                          className="h-7 w-12 rounded-lg border border-slate-200 text-center text-xs font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={item.jumlah >= item.obat.stok}
                          onClick={() =>
                            updateQuantity(item.obat.id, item.jumlah + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                          aria-label="Tambah"
                        >
                          <Icon name="plus" size={13} />
                        </button>
                      </div>

                      {/* Subtotal & Trash */}
                      <div className="text-right pl-2">
                        <p className="text-xs font-bold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.obat.id)}
                          className="text-[11px] text-red-500 hover:text-red-700"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Info & Checkout Form */}
              <form onSubmit={handleCheckout} className="border-t border-slate-200 p-5 bg-slate-50/30 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Pelanggan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={namaPelanggan}
                      onChange={(e) => setNamaPelanggan(e.target.value)}
                      placeholder="Contoh: Bpk. Ahmad / Umum"
                      className="h-9 w-full rounded-xl border border-slate-300 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["Tunai", "QRIS", "Transfer", "Debit"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMetodePembayaran(m)}
                          className={`rounded-lg py-1.5 text-xs font-bold transition border ${
                            metodePembayaran === m
                              ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {metodePembayaran === "Tunai" && (
                    <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-teal-900">
                          Uang Diterima
                        </label>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Kembalian:{" "}
                          <span
                            className={`font-bold ${
                              isUnderpaid ? "text-red-600" : "text-emerald-700"
                            }`}
                          >
                            {formatRupiah(kembalian)}
                          </span>
                        </span>
                      </div>
                      <input
                        type="text"
                        value={uangBayar}
                        onChange={(e) => setUangBayar(e.target.value)}
                        placeholder="Contoh: 50000"
                        className="h-9 w-full rounded-xl border border-teal-300 px-3 text-xs font-bold text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                      {/* Quick Cash Buttons */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setUangBayar(String(grandTotal))}
                          className="rounded-md bg-white border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-800 hover:bg-teal-50"
                        >
                          Uang Pas
                        </button>
                        {[20000, 50000, 100000, 200000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setUangBayar(String(amt))}
                            className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {formatRupiah(amt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan / Keterangan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Resep dokter, info dosis, dll..."
                      className="h-9 w-full rounded-xl border border-slate-300 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Jumlah Item</span>
                    <span className="font-semibold text-slate-800">
                      {totalItemCount} item
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Metode Pembayaran</span>
                    <span className="font-semibold text-teal-800">
                      {metodePembayaran}
                    </span>
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-2 flex items-baseline justify-between text-base">
                    <span className="font-bold text-slate-800">Total Akhir</span>
                    <span className="text-xl font-black text-teal-800">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <button
                  type="submit"
                  disabled={cart.length === 0 || processingCheckout || (metodePembayaran === "Tunai" && isUnderpaid)}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-bold text-white shadow-md transition hover:bg-teal-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {processingCheckout ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Memproses Transaksi...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={18} />
                      <span>Selesaikan & Proses Pembayaran</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT TRANSAKSI VIEW */}
      {activeTab === "riwayat" && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Penjualan Hari Ini
              </span>
              <p className="mt-2 text-2xl font-black text-teal-800">
                {formatRupiah(riwayatStats.total_hari_ini)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Omset tercatat pada tanggal hari ini
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Jumlah Transaksi Hari Ini
              </span>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {riwayatStats.jumlah_hari_ini}{" "}
                <span className="text-sm font-semibold text-slate-500">
                  transaksi
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Faktur diterbitkan hari ini
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cabang Apotek
              </span>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {riwayatStats.apotek || user?.apotek || "-"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Data terisolasi untuk cabang ini
              </p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cari Transaksi
                </label>
                <div className="relative w-56">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Icon name="search" size={14} />
                  </span>
                  <input
                    type="search"
                    value={searchRiwayat}
                    onChange={(e) => setSearchRiwayat(e.target.value)}
                    placeholder="No. Faktur / Kasir..."
                    className="h-10 w-full rounded-xl border border-slate-300 pl-8 pr-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
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
                onClick={() => void loadRiwayat(1)}
                className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Terapkan Filter
              </button>
            </div>

            {/* Export Range PDF */}
            <button
              type="button"
              disabled={downloadingReport}
              onClick={handleDownloadReport}
              className="h-10 flex items-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-bold text-white hover:bg-teal-800 transition disabled:opacity-50"
            >
              {downloadingReport ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <Icon name="download" size={15} />
                  <span>Unduh PDF Periode</span>
                </>
              )}
            </button>
          </div>

          {/* Transactions Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loadingRiwayat ? (
              <div className="p-16 text-center text-slate-500">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
                <p className="mt-3 text-sm font-semibold">Memuat riwayat transaksi...</p>
              </div>
            ) : riwayatData.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Icon name="report" size={26} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800">
                  Belum ada transaksi
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Belum ada penjualan tercatat pada periode ini untuk cabang {user?.apotek}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">No. Faktur</th>
                      <th className="px-5 py-3.5 font-bold">Tanggal & Waktu</th>
                      <th className="px-5 py-3.5 font-bold">Kasir</th>
                      <th className="px-5 py-3.5 font-bold">Pelanggan</th>
                      <th className="px-5 py-3.5 font-bold text-center">Item</th>
                      <th className="px-5 py-3.5 font-bold">Metode</th>
                      <th className="px-5 py-3.5 font-bold text-right">Total Transaksi</th>
                      <th className="px-5 py-3.5 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riwayatData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-4 font-mono font-bold text-slate-900 text-xs">
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
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {item.total_item} item
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                            {item.metode_pembayaran}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-black text-slate-900">
                          {formatRupiah(item.total)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailModalItem(item)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                            >
                              Rincian
                            </button>
                            <button
                              type="button"
                              disabled={downloadingPdfId === item.id}
                              onClick={() => void handleDownloadPdf(item)}
                              className="flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 text-xs font-bold text-teal-800 hover:bg-teal-100 transition disabled:opacity-50"
                              title="Unduh Struk PDF"
                            >
                              <Icon name="download" size={13} />
                              <span>PDF</span>
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
            {riwayatMeta.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Halaman <span className="font-bold">{riwayatMeta.current_page}</span> dari{" "}
                  <span className="font-bold">{riwayatMeta.last_page}</span> (Total {riwayatMeta.total} transaksi)
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={riwayatMeta.current_page <= 1}
                    onClick={() => void loadRiwayat(riwayatMeta.current_page - 1)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={riwayatMeta.current_page >= riwayatMeta.last_page}
                    onClick={() => void loadRiwayat(riwayatMeta.current_page + 1)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CHECKOUT SUCCESS / NOTA DIALOG */}
      {checkoutSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-bold">
                  <Icon name="check" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Transaksi Berhasil!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Struk nota resmi apotek telah diterbitkan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutSuccessData(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 font-mono text-xs text-slate-800">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <p className="text-sm font-black tracking-wider uppercase text-slate-900">
                  APOTEK KITA &middot; {checkoutSuccessData.apotek}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No. Faktur: {checkoutSuccessData.no_faktur}
                </p>
                <p className="text-[11px] text-slate-500">
                  {checkoutSuccessData.tanggal_penjualan} &middot; Kasir: {checkoutSuccessData.kasir}
                </p>
                {checkoutSuccessData.nama_pelanggan && (
                  <p className="text-[11px] text-slate-600 mt-1">
                    Pelanggan: {checkoutSuccessData.nama_pelanggan}
                  </p>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                {checkoutSuccessData.rincian.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900">{item.nama_obat}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.jumlah} {item.satuan} &times; {formatRupiah(item.harga_jual)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals & Payment */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-slate-600">
                  <span>Metode</span>
                  <span className="font-bold">{checkoutSuccessData.metode_pembayaran}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL</span>
                  <span>{formatRupiah(checkoutSuccessData.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadPdf(checkoutSuccessData)}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-bold text-white hover:bg-teal-800 transition"
              >
                <Icon name="download" size={16} />
                <span>Unduh PDF Struk</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutSuccessData(null);
                  setActiveTab("pos");
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TRANSACTION DETAIL DIALOG */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700 uppercase">
                  {detailModalItem.no_faktur}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Penjualan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Tanggal & Waktu
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {detailModalItem.tanggal_penjualan}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Kasir Pelaksana
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {detailModalItem.kasir}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Pelanggan
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {detailModalItem.nama_pelanggan || "Pelanggan Umum"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Metode Pembayaran
                  </span>
                  <p className="font-semibold text-teal-800 mt-0.5">
                    {detailModalItem.metode_pembayaran}
                  </p>
                </div>
                {detailModalItem.keterangan && (
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">
                      Catatan
                    </span>
                    <p className="text-slate-700 mt-0.5">
                      {detailModalItem.keterangan}
                    </p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Daftar Obat Dibeli ({detailModalItem.rincian.length})
                </h4>
                <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                  {detailModalItem.rincian.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.nama_obat}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.jumlah} {item.satuan} &times; {formatRupiah(item.harga_jual)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                  <div className="p-3.5 bg-slate-50 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>Total Pembayaran</span>
                    <span className="text-teal-800">
                      {formatRupiah(detailModalItem.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadPdf(detailModalItem)}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-bold text-white hover:bg-teal-800 transition"
              >
                <Icon name="download" size={16} />
                <span>Unduh PDF Transaksi Ini</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
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
