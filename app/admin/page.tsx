"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Download,
  LogOut,
  Lock,
  FileImage,
  FileVideo,
  Calendar,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import type { Session, MediaItem } from "@/lib/supabase";

type MediaItemWithSession = MediaItem & { sessions?: Session };

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  // Dashboard state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [media, setMedia] = useState<MediaItemWithSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"media" | "sessions">("media");

  // New session form
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "session" | "media"; id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setAdminPassword(password);
        setIsAuthenticated(true);
      } else {
        const data = await res.json();
        setAuthError(data.error || "Kata laluan salah.");
      }
    } catch {
      setAuthError("Ralat rangkaian. Cuba semula.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessRes, medRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/media"),
      ]);
      setSessions(await sessRes.json());
      setMedia(await medRes.json());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate) return;
    setIsCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, date: newDate, adminPassword }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewDate("");
        await loadData();
      } else {
        const data = await res.json();
        setCreateError(data.error || "Gagal mencipta sesi.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);

    try {
      const url =
        deleteConfirm.type === "session"
          ? `/api/sessions/${deleteConfirm.id}`
          : `/api/media/${deleteConfirm.id}`;

      await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });

      setDeleteConfirm(null);
      await loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMedia =
    selectedSession === "all"
      ? media
      : media.filter((m) => m.session_id === selectedSession);

  const formatSize = (url: string) => {
    const ext = url.split(".").pop()?.toLowerCase();
    if (["mp4", "mov"].includes(ext ?? "")) return "Video";
    return "Imej";
  };

  // ─── Login Screen ──────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-stone-900 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-5 h-5 text-stone-50" />
            </div>
            <h1 className="heading-md">Panel Admin</h1>
            <p className="text-stone-400 text-sm mt-1">Masukkan kata laluan untuk teruskan</p>
          </div>

          <div className="card">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label-base block mb-2" htmlFor="admin-password">
                  Kata Laluan
                </label>
                <input
                  id="admin-password"
                  type="password"
                  className="input-base"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                {authError && (
                  <p className="text-xs text-red-600 mt-1.5">{authError}</p>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary w-full justify-center"
                disabled={isAuthLoading || !password}
                id="login-button"
              >
                {isAuthLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-stone-400 border-t-stone-50 rounded-full animate-spin" />
                    Menyemak...
                  </>
                ) : (
                  "Log Masuk"
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-6">
            <Link href="/" className="text-xs text-stone-400 hover:text-stone-900 transition-colors">
              ← Kembali ke halaman utama
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin Dashboard ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
        <div className="container-main py-4 flex items-center justify-between">
          <div>
            <p className="label-base">Panel Kawalan</p>
            <h1 className="text-base font-semibold text-stone-900 leading-none mt-0.5">
              Admin Dashboard
            </h1>
          </div>
          <button
            className="btn-ghost text-xs flex items-center gap-1.5"
            onClick={() => {
              setIsAuthenticated(false);
              setAdminPassword("");
              setPassword("");
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </header>

      <main className="container-main page-section">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-200 mb-10">
          {[
            { label: "Jumlah Sesi", value: sessions.length },
            { label: "Jumlah Fail", value: media.length },
            { label: "Gambar", value: media.filter((m) => m.file_type === "image").length },
            { label: "Video", value: media.filter((m) => m.file_type === "video").length },
          ].map((stat) => (
            <div key={stat.label} className="bg-white px-6 py-5">
              <p className="label-base mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-stone-900 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 mb-8">
          {(["media", "sessions"] as const).map((tab) => (
            <button
              key={tab}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors duration-150 -mb-px ${
                activeTab === tab
                  ? "border-stone-900 text-stone-900"
                  : "border-transparent text-stone-400 hover:text-stone-700"
              }`}
              onClick={() => setActiveTab(tab)}
              id={`tab-${tab}`}
            >
              {tab === "media" ? "Fail Media" : "Sesi Program"}
            </button>
          ))}
        </div>

        {/* ── Tab: Media ─────────────────────────────────────────── */}
        {activeTab === "media" && (
          <div className="animate-fade-in">
            {/* Filter */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-stone-500">
                {filteredMedia.length} fail{selectedSession !== "all" ? " dalam sesi ini" : " keseluruhan"}
              </p>
              <div className="relative">
                <select
                  className="select-base text-xs py-1.5 pr-8 pl-3 w-52"
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  aria-label="Tapis sesi"
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
            </div>

            {isLoading ? (
              <div className="space-y-px">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-stone-200">
                <p className="text-stone-400 text-sm">Tiada fail ditemui.</p>
              </div>
            ) : (
              <div className="border border-stone-200 overflow-hidden">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Fail</th>
                      <th className="hidden md:table-cell">Sesi</th>
                      <th className="hidden sm:table-cell">Penyumbang</th>
                      <th className="hidden md:table-cell">Tarikh</th>
                      <th className="text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedia.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-stone-100 flex items-center justify-center shrink-0">
                              {item.file_type === "video" ? (
                                <FileVideo className="w-4 h-4 text-stone-500" />
                              ) : (
                                <FileImage className="w-4 h-4 text-stone-500" />
                              )}
                            </div>
                            <div>
                              <span className="tag capitalize">{item.file_type}</span>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="text-stone-600 text-xs">
                            {item.sessions?.title ?? sessions.find((s) => s.id === item.session_id)?.title ?? "—"}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell">
                          <span className="text-stone-600 text-xs">
                            {item.uploader_name ?? <span className="text-stone-300">—</span>}
                          </span>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="text-stone-400 text-xs">
                            {new Date(item.created_at).toLocaleDateString("ms-MY")}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="btn-ghost p-1.5"
                              aria-label="Muat Turun"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              className="btn-danger p-1.5"
                              aria-label="Padam"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "media",
                                  id: item.id,
                                  label: `${item.file_type} oleh ${item.uploader_name ?? "Tanpa nama"}`,
                                })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Sessions ──────────────────────────────────────── */}
        {activeTab === "sessions" && (
          <div className="animate-fade-in space-y-8">
            {/* Create Session Form */}
            <div className="card">
              <h2 className="heading-md mb-1">Tambah Sesi</h2>
              <p className="text-stone-400 text-sm mb-6">Cipta sesi program baharu.</p>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-base block mb-2" htmlFor="session-title">
                      Tajuk Sesi
                    </label>
                    <input
                      id="session-title"
                      type="text"
                      className="input-base"
                      placeholder="cth: Majlis Penutup 2025"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label-base block mb-2" htmlFor="session-date">
                      Tarikh
                    </label>
                    <div className="relative">
                      <input
                        id="session-date"
                        type="date"
                        className="input-base pr-10"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        required
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                {createError && (
                  <p className="text-xs text-red-600">{createError}</p>
                )}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isCreating || !newTitle || !newDate}
                  id="create-session-button"
                >
                  {isCreating ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-stone-400 border-t-stone-50 rounded-full animate-spin" />
                      Mencipta...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Tambah
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Sessions List */}
            {isLoading ? (
              <div className="space-y-px">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-200">
                <p className="text-stone-400 text-sm">Tiada sesi lagi.</p>
              </div>
            ) : (
              <div className="border border-stone-200 overflow-hidden">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Tajuk Sesi</th>
                      <th className="hidden sm:table-cell">Tarikh</th>
                      <th className="hidden md:table-cell">Bil. Fail</th>
                      <th className="text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const count = media.filter((m) => m.session_id === session.id).length;
                      return (
                        <tr key={session.id}>
                          <td className="font-medium">{session.title}</td>
                          <td className="hidden sm:table-cell text-stone-400 text-xs">
                            {new Date(session.date).toLocaleDateString("ms-MY", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </td>
                          <td className="hidden md:table-cell">
                            <span className="tag">{count} fail</span>
                          </td>
                          <td>
                            <div className="flex justify-end">
                              <button
                                className="btn-danger p-1.5 flex items-center gap-1.5 text-xs"
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: "session",
                                    id: session.id,
                                    label: session.title,
                                  })
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Padam</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-stone-950 bg-opacity-60 flex items-center justify-center px-4 animate-fade-in"
          onClick={() => !isDeleting && setDeleteConfirm(null)}
        >
          <div
            className="bg-white border border-stone-200 w-full max-w-sm p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">Sahkan Padam</h3>
                <p className="text-sm text-stone-500">
                  {deleteConfirm.type === "session"
                    ? `Sesi "${deleteConfirm.label}" dan semua fail di dalamnya akan dipadamkan.`
                    : `"${deleteConfirm.label}" akan dipadamkan secara kekal.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                className="btn-secondary text-xs"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                className="btn-primary text-xs bg-stone-700 border-stone-700 hover:bg-stone-900"
                onClick={handleDelete}
                disabled={isDeleting}
                id="confirm-delete-button"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-stone-400 border-t-stone-50 rounded-full animate-spin" />
                    Memadam...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Padam
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-stone-200 mt-12">
        <div className="container-main py-4 text-center">
          <p className="text-xs text-stone-400">Admin Dashboard — Event Media Drop Portal</p>
        </div>
      </footer>
    </div>
  );
}
