import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeri Media | Event Media Drop Portal",
  description: "Arkib media kolaboratif program dan acara — gambar dan video daripada semua sesi.",
  robots: "noindex",
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
