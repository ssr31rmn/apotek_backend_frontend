import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef4f3] px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-teal-800 p-7 text-white sm:p-10 lg:min-h-[620px]">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[28px] border-teal-700/60" />
          <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full border-[24px] border-teal-900/30" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl font-semibold text-teal-800 shadow-sm">
                +
              </div>
              <div>
                <p className="font-bold tracking-tight">Apotek Kita</p>
                <p className="text-xs text-teal-100">Sistem Informasi Apotek</p>
              </div>
            </div>
            <div className="mt-12 max-w-sm lg:mt-24">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
                Ruang kerja apotek
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Kerja lebih teratur, pelayanan lebih siap.
              </h1>
              <p className="mt-5 max-w-xs text-sm leading-6 text-teal-100">
                Kelola obat, stok, transaksi, dan laporan dari satu sistem yang
                mudah dipahami.
              </p>
            </div>
          </div>
          <div className="relative mt-10 flex items-center gap-3 text-xs text-teal-100">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            <span>Platform operasional internal</span>
          </div>
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-16">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
              Selamat datang kembali
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Masuk ke sistem
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Gunakan akun kerja Anda untuk melanjutkan ke area apotek.
            </p>
          </div>
          <LoginForm />
          <p className="mt-8 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500">
            Sesi login dikelola dengan aman oleh Laravel.
          </p>
        </div>
      </section>
    </main>
  );
}
