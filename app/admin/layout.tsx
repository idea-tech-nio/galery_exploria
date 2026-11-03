import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Admin | Event Media Drop Portal",
  description: "Halaman pentadbiran — pengurusan sesi dan media.",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
