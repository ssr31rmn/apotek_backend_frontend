type Category = {
  nama: string;
};

type Medicine = {
  id: number;
  kode_obat: string;
  nama: string;
  golongan: string;
  bentuk_sediaan: string;
  satuan: string;
  harga_jual: number;
  stok: number;
  stok_minimum: number;
  stok_menipis: boolean;
  tanggal_kadaluarsa: string;
  aktif: boolean;
  kategori?: Category | null;
};

type MedicineResponse = {
  success: boolean;
  data: Medicine[];
};

type LoginResponse = {
  success: boolean;
  token?: string;
  access_token?: string;
  data?: {
    token?: string;
    access_token?: string;
  };
};

const API_BASE_URL =
  process.env.APOTEK_API_BASE_URL ?? "http://10.50.9.228:8090/api";
const API_URL = `${API_BASE_URL}/obat`;
const LOGIN_URL = `${API_BASE_URL}/auth/login`;

async function getApiToken() {
  const configuredToken = process.env.APOTEK_API_TOKEN;
  if (configuredToken) {
    return configuredToken;
  }

  const email = process.env.APOTEK_API_EMAIL;
  const password = process.env.APOTEK_API_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "API membutuhkan autentikasi. Isi APOTEK_API_EMAIL dan APOTEK_API_PASSWORD pada file .env.local.",
    );
  }

  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 422) {
      throw new Error(
        "Login API gagal. Periksa APOTEK_API_EMAIL dan APOTEK_API_PASSWORD.",
      );
    }
    throw new Error(`Login API mengembalikan status ${response.status}`);
  }

  const result = (await response.json()) as LoginResponse;
  const token =
    result.token ??
    result.access_token ??
    result.data?.token ??
    result.data?.access_token;
  if (!result.success || !token) {
    throw new Error("Login API tidak mengembalikan token autentikasi.");
  }

  return token;
}

async function getMedicines() {
  const token = await getApiToken();
  const response = await fetch(API_URL, {
    cache: "no-store",
    headers: { Authorization: "Bearer " + token },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Token API ditolak. Periksa kredensial API atau APOTEK_API_TOKEN pada file .env.local.",
      );
    }
    throw new Error(`API mengembalikan status ${response.status}`);
  }

  const result = (await response.json()) as MedicineResponse;

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("Format data obat dari API tidak valid");
  }

  return result.data;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function Home() {
  let medicines: Medicine[];
  let apiError: string | null = null;

  try {
    medicines = await getMedicines();
  } catch (error) {
    medicines = [];
    apiError =
      error instanceof Error
        ? error.message
        : "Data obat tidak dapat dimuat dari API.";
  }

  if (apiError) {
    return <ApiErrorState message={apiError} />;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#16856f]">
              Data API Apotek
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#142f39] sm:text-4xl">Tabel obat</h1>
            <p className="mt-2 text-sm text-[#70828b]">
              Daftar obat yang diambil dari endpoint API apotek.
            </p>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#e1e9e9] bg-white shadow-[0_8px_30px_rgba(26,65,72,0.05)]">
          <div className="flex flex-col gap-4 border-b border-[#edf1f1] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 className="text-lg font-bold text-[#142f39]">Daftar obat</h2>
              <p className="mt-1 text-sm text-[#829198]">Data terbaru dari sistem apotek</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#f4f8f8] px-3 py-2 text-xs font-medium text-[#71848a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#20b486]" />
              {medicines.length} obat ditemukan
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-[#f8fafb] text-[11px] uppercase tracking-[0.08em] text-[#8a9aa0]">
                <tr>
                  <th className="px-7 py-4 font-semibold">Obat</th>
                  <th className="px-4 py-4 font-semibold">Kategori</th>
                  <th className="px-4 py-4 font-semibold">Sediaan</th>
                  <th className="px-4 py-4 font-semibold">Harga jual</th>
                  <th className="px-4 py-4 font-semibold">Stok</th>
                  <th className="px-4 py-4 font-semibold">Kadaluarsa</th>
                  <th className="px-7 py-4 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f1]">
                {medicines.map((medicine) => (
                  <tr className="transition-colors hover:bg-[#fbfdfd]" key={medicine.id}>
                    <td className="px-7 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e5f7f1] text-sm font-bold text-[#16856f]">
                          {medicine.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="max-w-[245px] truncate text-sm font-semibold text-[#243d45]" title={medicine.nama}>
                            {medicine.nama}
                          </p>
                          <p className="mt-1 text-xs font-medium text-[#98a7ac]">{medicine.kode_obat}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm capitalize text-[#526970]">
                      {medicine.kategori?.nama ?? "Tanpa kategori"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-[#526970]">{medicine.bentuk_sediaan}</p>
                      <p className="mt-1 text-xs text-[#9aa8ac]">per {medicine.satuan}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#243d45]">
                      {formatCurrency(medicine.harga_jual)}
                    </td>
                    <td className="px-4 py-4">
                      <p className={`text-sm font-bold ${medicine.stok_menipis ? "text-[#e8793d]" : "text-[#243d45]"}`}>
                        {medicine.stok} {medicine.satuan}
                      </p>
                      <p className="mt-1 text-xs text-[#9aa8ac]">Min. {medicine.stok_minimum}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#526970]">{formatDate(medicine.tanggal_kadaluarsa)}</td>
                    <td className="px-7 py-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${medicine.stok_menipis ? "bg-[#fff1e8] text-[#d9682d]" : medicine.aktif ? "bg-[#e6f8f1] text-[#16856f]" : "bg-[#f0f2f3] text-[#708086]"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${medicine.stok_menipis ? "bg-[#ee8848]" : medicine.aktif ? "bg-[#20b486]" : "bg-[#9aa6aa]"}`} />
                        {medicine.stok_menipis ? "Stok menipis" : medicine.aktif ? "Tersedia" : "Tidak aktif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-[#9aa8ac]">
          Data ditampilkan langsung dari {API_URL}
        </p>
      </div>
    </main>
  );
}

function ApiErrorState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5">
      <section className="w-full max-w-xl rounded-2xl border border-[#f2d8ca] bg-white p-7 text-center shadow-[0_8px_30px_rgba(26,65,72,0.05)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0e6] text-[#d9682d]">
          <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.7 2.6 18a2 2 0 0 0 1.75 3h15.3a2 2 0 0 0 1.75-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-bold text-[#142f39]">Data obat belum dapat dimuat</h1>
        <p className="mt-2 text-sm leading-6 text-[#70828b]">{message}</p>
        <p className="mt-5 rounded-lg bg-[#f8fafb] px-4 py-3 text-left text-xs leading-5 text-[#70828b]">
          Untuk menjalankan aplikasi, buat file <code className="font-semibold text-[#526970]">.env.local</code> di root project dan isi{" "}
          <code className="font-semibold text-[#526970]">APOTEK_API_EMAIL</code> serta{" "}
          <code className="font-semibold text-[#526970]">APOTEK_API_PASSWORD</code>, lalu restart server Next.js.
        </p>
      </section>
    </main>
  );
}
