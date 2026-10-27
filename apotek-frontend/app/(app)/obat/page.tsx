import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ObatTable } from "@/components/obat-table";

export const metadata: Metadata = { title: "Manajemen Obat" };
export default function ObatPage() {
  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Manajemen Obat"
        description="Lihat informasi obat, harga, stok, dan tanggal kedaluwarsa dari data Laravel."
      />
      <ObatTable />
    </>
  );
}
