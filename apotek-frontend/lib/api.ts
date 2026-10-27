const laravelUrl =
  process.env.NEXT_PUBLIC_LARAVEL_URL ?? "http://localhost:8000";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string | null;
  roles: string[];
  apotek: string | null;
  apotek_id: number | null;
  permissions: string[];
};

export type Obat = {
  id: number;
  kode_obat: string;
  nama_obat: string;
  apotek: string | null;
  kategori: { id: number; nama: string } | null;
  satuan: string;
  harga_beli: string;
  harga_jual: string;
  stok: number;
  stok_minimum: number;
  tanggal_kadaluarsa: string | null;
  keterangan: string | null;
};

export type ObatMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  filters: {
    kategori: { id_kategori: number; nama_kategori: string }[];
    satuan: string[];
  };
  sort: string;
  direction: "asc" | "desc";
};

export type Kategori = {
  id_kategori: number;
  nama_kategori: string;
  obat_count: number;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  meta?: unknown;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

function xsrfToken() {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("XSRF-TOKEN="));

  return cookie ? decodeURIComponent(cookie.slice("XSRF-TOKEN=".length)) : "";
}

async function refreshCsrfCookie() {
  await fetch(`${laravelUrl}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retryOnCsrf = true,
) {
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    await refreshCsrfCookie();
  }

  const response = await fetch(`${laravelUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.method && init.method !== "GET"
        ? { "X-XSRF-TOKEN": xsrfToken() }
        : {}),
      ...init.headers,
    },
  });

  const body = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (response.status === 419 && retryOnCsrf) {
    await refreshCsrfCookie();
    return request<T>(path, init, false);
  }

  if (!response.ok) {
    let message = body?.message ?? "Terjadi kesalahan saat menghubungi server.";
    if (body?.errors) {
      const firstError = Object.values(body.errors).flat()[0];
      if (firstError) {
        message = firstError;
      }
    }
    throw new ApiError(message, response.status, body?.errors);
  }

  return body as ApiResponse<T>;
}

export async function login(
  email: string,
  password: string,
  remember: boolean,
) {
  const response = await request<{ user: AuthUser }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember }),
  });

  return response.data?.user;
}

export async function currentUser() {
  const response = await request<{ user: AuthUser }>("/api/user");
  return response.data?.user;
}

export async function logout() {
  try {
    await request<null>("/api/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch (error) {
    // A missing session already means the client is logged out.
    if (error instanceof ApiError && error.status === 401) return;
    throw error;
  }
}

export async function obatList(params: {
  search?: string;
  kategoriId?: string;
  satuan?: string;
  sort?: string;
  direction?: "asc" | "desc";
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.kategoriId) query.set("kategori_id", params.kategoriId);
  if (params.satuan) query.set("satuan", params.satuan);
  if (params.sort) query.set("sort_by", params.sort);
  if (params.direction) query.set("direction", params.direction);
  if (params.page) query.set("page", String(params.page));

  const response = await request<Obat[]>(`/api/obat?${query.toString()}`);
  return { data: response.data ?? [], meta: response.meta as ObatMeta };
}

export type ObatInput = {
  kode_obat: string;
  nama_obat: string;
  kategori_id: number | null;
  satuan: string;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  stok_minimum: number;
  tanggal_kadaluarsa: string | null;
  keterangan: string | null;
};

export async function obatCreate(input: ObatInput) {
  const response = await request<Obat>("/api/obat", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function obatUpdate(id: number, input: ObatInput) {
  const response = await request<Obat>(`/api/obat/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function obatDelete(id: number) {
  await request<null>(`/api/obat/${id}`, { method: "DELETE" });
}

export async function obatDetail(id: number) {
  const response = await request<Obat>(`/api/obat/${id}`);
  return response.data;
}

export async function kategoriList() {
  const response = await request<Kategori[]>("/api/kategori");
  return response.data ?? [];
}

export async function kategoriCreate(nama_kategori: string) {
  const response = await request<Kategori>("/api/kategori", {
    method: "POST",
    body: JSON.stringify({ nama_kategori }),
  });
  return response.data;
}

export async function kategoriUpdate(id: number, nama_kategori: string) {
  const response = await request<Kategori>(`/api/kategori/${id}`, {
    method: "PUT",
    body: JSON.stringify({ nama_kategori }),
  });
  return response.data;
}

export async function kategoriDelete(id: number) {
  await request<null>(`/api/kategori/${id}`, { method: "DELETE" });
}

export type DashboardData = {
  stats: {
    total_obat: number;
    stok_menipis: number;
    transaksi_hari_ini: number;
    penjualan_hari_ini: number;
  };
  perlu_perhatian: {
    obat_menipis: {
      id: number;
      kode_obat: string;
      nama_obat: string;
      stok: number;
      stok_minimum: number;
      satuan: string;
      status: "habis" | "menipis";
    }[];
    obat_kedaluwarsa: {
      id: number;
      kode_obat: string;
      nama_obat: string;
      tanggal_kadaluarsa: string | null;
      satuan: string;
      stok: number;
      is_expired: boolean;
    }[];
  };
  transaksi_terbaru: {
    id: number;
    no_faktur: string;
    kasir: string;
    tanggal: string;
    jumlah_item: number;
    total: number;
  }[];
};

export async function dashboardData() {
  const response = await request<DashboardData>("/api/dashboard");
  return response.data;
}

export type TransaksiObat = {
  id: number;
  kode_obat: string;
  nama_obat: string;
  apotek: string | null;
  kategori: { id: number; nama: string } | null;
  satuan: string;
  harga_jual: number;
  stok: number;
  stok_minimum: number;
  status_stok: "habis" | "menipis" | "aman";
  keterangan: string | null;
};

export type TransaksiItem = {
  obat: TransaksiObat;
  jumlah: number;
  subtotal: number;
};

export type CheckoutPayload = {
  items: { obat_id: number; jumlah: number }[];
  nama_pelanggan?: string;
  metode_pembayaran?: string;
  keterangan?: string;
  bayar?: number;
};

export type CheckoutResult = {
  id: number;
  no_faktur: string;
  tanggal_penjualan: string;
  nama_pelanggan: string | null;
  metode_pembayaran: string;
  keterangan: string | null;
  kasir: string;
  apotek: string;
  total: number;
  bayar: number | null;
  kembalian: number | null;
  items: {
    obat_id: number;
    nama_obat: string;
    kode_obat: string;
    satuan: string;
    jumlah: number;
    harga_jual: number;
    subtotal: number;
  }[];
};

export type RiwayatItem = {
  id: number;
  no_faktur: string;
  nama_pelanggan: string | null;
  tanggal_penjualan: string;
  raw_tanggal: string;
  kasir: string;
  apotek: string;
  metode_pembayaran: string;
  keterangan: string | null;
  total: number;
  total_item: number;
  rincian: {
    id: number;
    obat_id: number;
    nama_obat: string;
    satuan: string;
    jumlah: number;
    harga_jual: number;
    subtotal: number;
  }[];
};

export type RiwayatResponse = {
  data: RiwayatItem[];
  stats: {
    total_hari_ini: number;
    jumlah_hari_ini: number;
    apotek: string;
  };
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

export async function transaksiObatList(params?: {
  search?: string;
  kategoriId?: string | number;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.kategoriId) query.set("kategori_id", String(params.kategoriId));

  const response = await request<TransaksiObat[]>(
    `/api/transaksi/obat${query.toString() ? `?${query.toString()}` : ""}`,
  );
  return {
    data: response.data ?? [],
    apotek: (response as unknown as { apotek?: string }).apotek ?? "",
  };
}

export async function transaksiCheckout(payload: CheckoutPayload) {
  const response = await request<CheckoutResult>("/api/transaksi/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function transaksiRiwayat(params?: {
  search?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  page?: number;
  perPage?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.tanggalMulai) query.set("tanggal_mulai", params.tanggalMulai);
  if (params?.tanggalSelesai)
    query.set("tanggal_selesai", params.tanggalSelesai);
  if (params?.page) query.set("page", String(params.page));
  if (params?.perPage) query.set("per_page", String(params.perPage));

  const response = await request<RiwayatItem[]>(
    `/api/transaksi/riwayat${query.toString() ? `?${query.toString()}` : ""}`,
  );

  return {
    data: response.data ?? [],
    stats: (response as unknown as { stats: RiwayatResponse["stats"] }).stats ?? {
      total_hari_ini: 0,
      jumlah_hari_ini: 0,
      apotek: "",
    },
    meta: (response as unknown as { meta: RiwayatResponse["meta"] }).meta ?? {
      current_page: 1,
      per_page: 10,
      total: 0,
      last_page: 1,
    },
  };
}

export async function transaksiDetail(id: number) {
  const response = await request<RiwayatItem>(`/api/transaksi/riwayat/${id}`);
  return response.data;
}

export function transaksiPdfUrl(id: number) {
  return `${laravelUrl}/api/transaksi/riwayat/${id}/pdf`;
}

export function transaksiLaporanPdfUrl(
  tanggalMulai: string,
  tanggalSelesai: string,
) {
  return `${laravelUrl}/api/transaksi/laporan/pdf?tanggal_mulai=${tanggalMulai}&tanggal_selesai=${tanggalSelesai}`;
}

export async function downloadPdfFile(url: string, filename: string) {
  const response = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/pdf" },
  });

  if (!response.ok) {
    throw new Error("Gagal mengunduh file PDF.");
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

