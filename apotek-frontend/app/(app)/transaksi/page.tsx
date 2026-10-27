import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { TransaksiView } from "@/components/transaksi-view";

export const metadata: Metadata = { title: "Transaksi Penjualan" };

export default function TransaksiPage() {
  return (
    <>
      <PageHeader
        eyebrow="Kasir & Penjualan"
        title="Transaksi Penjualan"
        description="Kelola proses kasir penjualan obat, periksa keranjang, dan pantau riwayat transaksi apotek."
      />
      <TransaksiView />
    </>
  );
}

