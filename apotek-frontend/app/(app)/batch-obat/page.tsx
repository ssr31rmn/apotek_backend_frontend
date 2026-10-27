import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { BatchManager } from "@/components/batch-manager";

export const metadata: Metadata = { title: "Batch Obat (Mockup)" };

export default function BatchObatPage() {
  return (
    <>
      <PageHeader
        eyebrow="Inventori & Kedaluwarsa"
        title="Batch Obat"
        description="Kelola nomor batch, pantau tanggal kedaluwarsa, dan terapkan prioritas First Expired, First Out (FEFO)."
      />
      <BatchManager />
    </>
  );
}
