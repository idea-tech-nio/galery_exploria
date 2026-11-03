import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Media Drop Portal",
  description:
    "Platform muat naik media kolaboratif untuk program dan acara. Kongsi gambar dan video anda dengan mudah.",
  keywords: ["media", "upload", "event", "gallery", "photo", "video"],
  openGraph: {
    title: "Event Media Drop Portal",
    description: "Platform muat naik media kolaboratif untuk program dan acara.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ms">
      <body className="bg-stone-50 text-stone-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
