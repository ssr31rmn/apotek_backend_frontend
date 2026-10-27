import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/ui";

export const metadata: Metadata = { title: "Manajemen User" };
export default function UsersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pengaturan"
        title="Manajemen User"
        description="Kelola akun, jabatan, dan penempatan user pada apotek."
        action="Tambah user"
      />
      <PlaceholderPanel
        title="Daftar user akan tampil di sini"
        description="Role admin, kasir, dan apotek akan ditampilkan setelah autentikasi Laravel tersedia."
      />
    </>
  );
}
