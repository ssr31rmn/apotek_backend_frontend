import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { KategoriManager } from "@/components/kategori-manager";

export const metadata: Metadata = { title: "Kategori Obat" };
export default function KategoriPage() {
  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Kategori Obat"
        description="Kelola kategori untuk membantu pencarian dan pengelompokan obat."
      />
      <KategoriManager />
    </>
  );
}
