import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { LaporanView } from "@/components/laporan-view";

export const metadata: Metadata = { title: "Laporan Transaksi" };

export default function LaporanPage() {
  return (
    <>
      <PageHeader
        eyebrow="Penjualan & Keuangan"
        title="Laporan Transaksi"
        description="Tinjau rekapitulasi riwayat penjualan dan unduh laporan transaksi berdasarkan periode waktu."
      />
      <LaporanView />
    </>
  );
}

