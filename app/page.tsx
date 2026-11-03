"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Upload, X, ChevronDown, Play, ImageOff, ShieldCheck, Grid } from "lucide-react";
import type { MediaItem, Session } from "@/lib/supabase";

type MediaItemWithSession = MediaItem & { sessions?: Session };

export default function GalleryHomePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [media, setMedia] = useState<MediaItemWithSession[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaItemWithSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [lightboxItem, setLightboxItem] = useState<MediaItemWithSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/media").then((r) => r.json()),
    ])
      .then(([sess, med]) => {
        if (Array.isArray(sess)) setSessions(sess as Session[]);
        if (Array.isArray(med)) {
          setMedia(med as MediaItemWithSession[]);
          setFilteredMedia(med as MediaItemWithSession[]);
        }
      })
      .catch((err) => console.error("Ralat memuatkan data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSession === "all") {
      setFilteredMedia(media);
    } else {
      setFilteredMedia(media.filter((m) => m.session_id === selectedSession));
    }
  }, [selectedSession, media]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!lightboxItem) return;
      if (e.key === "Escape") setLightboxItem(null);
      if (e.key === "ArrowRight") {
        const idx = filteredMedia.findIndex((m) => m.id === lightboxItem.id);
        if (idx < filteredMedia.length - 1) setLightboxItem(filteredMedia[idx + 1]);
      }
      if (e.key === "ArrowLeft") {
        const idx = filteredMedia.findIndex((m) => m.id === lightboxItem.id);
        if (idx > 0) setLightboxItem(filteredMedia[idx - 1]);
      }
    },
    [lightboxItem, filteredMedia]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const groupedMedia = sessions.reduce<Record<string, MediaItemWithSession[]>>((acc, session) => {
    const items =
      selectedSession === "all"
        ? filteredMedia.filter((m) => m.session_id === session.id)
        : filteredMedia;
    if (items.length > 0) acc[session.id] = items;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
        <div className="container-main py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-900 flex items-center justify-center">
              <Grid className="w-4 h-4 text-stone-50" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-stone-900">
                Media Drop Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Session Filter Desktop */}
            <div className="relative hidden md:block">
              <select
                className="select-base text-xs py-1.5 pr-8 pl-3 w-56"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                aria-label="Tapis mengikut sesi"
              >
                <option value="all">Semua Sesi</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            </div>

            <Link href="/upload" className="btn-primary text-xs px-3.5 py-2">
              <Upload className="w-3.5 h-3.5" />
              Muat Naik
            </Link>

            <Link href="/admin" className="btn-secondary text-xs px-3 py-2" title="Panel Pentadbir">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Filter */}
      <div className="md:hidden border-b border-stone-200 bg-white">
        <div className="container-main py-2.5">
          <div className="relative">
            <select
              className="select-base text-xs py-1.5 pr-8 pl-3"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
            >
              <option value="all">Semua Sesi</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <main className="container-main page-section">
        {/* Intro */}
        <div className="mb-10 pb-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="label-base mb-1.5">Arkib Media Program</p>
            <h1 className="heading-lg">Galeri Acara</h1>
          </div>
          <p className="text-xs text-stone-500">
            {filteredMedia.length} fail media dikongsi
          </p>
        </div>

        {isLoading ? (
          /* Skeleton Loading */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-stone-200">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-stone-100 animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        ) : filteredMedia.length === 0 ? (
          /* Empty State */
          <div className="text-center py-24 border border-dashed border-stone-200 bg-white">
            <ImageOff className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-600 font-medium text-sm">Belum ada media dimuat naik.</p>
            <p className="text-stone-400 text-xs mt-1 mb-6">
              Jadilah orang pertama menyumbang gambar atau video untuk acara ini.
            </p>
            <Link href="/upload" className="btn-primary inline-flex text-xs">
              <Upload className="w-4 h-4" />
              Muat Naik Sekarang
            </Link>
          </div>
        ) : selectedSession === "all" ? (
          /* Grouped by Session */
          <div className="space-y-12 animate-fade-in">
            {sessions
              .filter((s) => groupedMedia[s.id]?.length > 0)
              .map((session) => (
                <section key={session.id}>
                  <div className="flex items-end justify-between mb-3 pb-2 border-b border-stone-200">
                    <div>
                      <p className="label-base mb-0.5">
                        {new Date(session.date).toLocaleDateString("ms-MY", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <h2 className="heading-md">{session.title}</h2>
                    </div>
                    <span className="tag">{groupedMedia[session.id].length} fail</span>
                  </div>
                  <MediaGrid
                    items={groupedMedia[session.id]}
                    onSelect={setLightboxItem}
                  />
                </section>
              ))}
          </div>
        ) : (
          /* Single Session View */
          <div className="animate-fade-in">
            <div className="mb-6">
              <p className="label-base mb-1">
                {filteredMedia[0]?.sessions
                  ? new Date(filteredMedia[0].sessions.date).toLocaleDateString("ms-MY", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : ""}
              </p>
              <div className="flex items-end justify-between">
                <h2 className="heading-md">
                  {sessions.find((s) => s.id === selectedSession)?.title}
                </h2>
                <span className="tag">{filteredMedia.length} fail</span>
              </div>
            </div>
            <MediaGrid items={filteredMedia} onSelect={setLightboxItem} />
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          onClose={() => setLightboxItem(null)}
          onPrev={() => {
            const idx = filteredMedia.findIndex((m) => m.id === lightboxItem.id);
            if (idx > 0) setLightboxItem(filteredMedia[idx - 1]);
          }}
          onNext={() => {
            const idx = filteredMedia.findIndex((m) => m.id === lightboxItem.id);
            if (idx < filteredMedia.length - 1) setLightboxItem(filteredMedia[idx + 1]);
          }}
          hasPrev={filteredMedia.findIndex((m) => m.id === lightboxItem.id) > 0}
          hasNext={filteredMedia.findIndex((m) => m.id === lightboxItem.id) < filteredMedia.length - 1}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-16 bg-white">
        <div className="container-main py-6 flex items-center justify-between text-xs text-stone-400">
          <p>© {new Date().getFullYear()} Event Media Drop Portal</p>
          <Link href="/upload" className="hover:text-stone-900 transition-colors">
            Hantar Media Baharu →
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── Media Grid ─────────────────────────────────────────────── */
function MediaGrid({
  items,
  onSelect,
}: {
  items: MediaItemWithSession[];
  onSelect: (item: MediaItemWithSession) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-stone-200">
      {items.map((item) => (
        <button
          key={item.id}
          className="group relative aspect-square bg-stone-100 overflow-hidden focus:outline-none focus:ring-2 focus:ring-inset focus:ring-stone-900 text-left"
          onClick={() => onSelect(item)}
          aria-label={`Lihat ${item.file_type === "video" ? "video" : "gambar"}`}
        >
          {item.file_type === "image" ? (
            <Image
              src={item.file_url}
              alt={item.uploader_name ?? "Media"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-stone-800 relative">
              <video
                src={item.file_url}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                muted
                preload="metadata"
              />
              <div className="relative z-10 w-10 h-10 bg-white flex items-center justify-center">
                <Play className="w-4 h-4 text-stone-900 translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-stone-900 opacity-0 group-hover:opacity-20 transition-opacity duration-200" />

          {/* Uploader tag */}
          {item.uploader_name && (
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-stone-900 bg-opacity-70 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-[11px] text-stone-200 truncate">{item.uploader_name}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Lightbox ───────────────────────────────────────────────── */
function Lightbox({
  item,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  item: MediaItemWithSession;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950 bg-opacity-95 flex flex-col animate-fade-in"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {item.uploader_name && (
            <p className="text-sm text-stone-200 font-medium">{item.uploader_name}</p>
          )}
          <p className="text-xs text-stone-400">
            {new Date(item.created_at).toLocaleString("ms-MY")}
          </p>
        </div>
        <button
          className="p-2 text-stone-400 hover:text-stone-100 transition-colors"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Media */}
      <div
        className="flex-1 flex items-center justify-center px-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {item.file_type === "image" ? (
          <div className="relative max-w-5xl w-full h-full">
            <Image
              src={item.file_url}
              alt={item.uploader_name ?? "Media"}
              fill
              className="object-contain"
              sizes="100vw"
              priority
              unoptimized
            />
          </div>
        ) : (
          <video
            src={item.file_url}
            controls
            autoPlay
            className="max-w-5xl w-full max-h-full"
          />
        )}
      </div>

      {/* Navigation */}
      <div
        className="flex items-center justify-center gap-6 py-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={`px-4 py-2 text-xs font-medium text-stone-300 transition-colors border border-stone-800 bg-stone-900 ${
            hasPrev ? "hover:border-stone-600 hover:text-stone-100 cursor-pointer" : "opacity-30 cursor-not-allowed"
          }`}
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Sebelumnya"
        >
          ← Sebelum
        </button>
        <button
          className={`px-4 py-2 text-xs font-medium text-stone-300 transition-colors border border-stone-800 bg-stone-900 ${
            hasNext ? "hover:border-stone-600 hover:text-stone-100 cursor-pointer" : "opacity-30 cursor-not-allowed"
          }`}
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Seterusnya"
        >
          Seterus →
        </button>
      </div>
    </div>
  );
}
