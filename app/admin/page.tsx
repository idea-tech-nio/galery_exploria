"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Pencil,
  Eye,
  LayoutGrid,
  List,
  Play,
  X,
  Upload,
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
  const [mediaViewMode, setMediaViewMode] = useState<"table" | "grid">("table");

  // New session form (Create Session)
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit Session Modal (Update Session)
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState("");
  const [editSessionDate, setEditSessionDate] = useState("");
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  const [editSessionError, setEditSessionError] = useState("");

  // Edit Media Modal (Update Media)
  const [editingMedia, setEditingMedia] = useState<MediaItemWithSession | null>(null);
  const [editMediaUploader, setEditMediaUploader] = useState("");
  const [editMediaSessionId, setEditMediaSessionId] = useState("");
  const [isUpdatingMedia, setIsUpdatingMedia] = useState(false);
  const [editMediaError, setEditMediaError] = useState("");

  // Preview Modal (Admin Lightbox)
  const [previewItem, setPreviewItem] = useState<MediaItemWithSession | null>(null);

  // Delete confirm (Delete Session / Media)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "session" | "media";
    id: string;
    label: string;
  } | null>(null);
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

  // CREATE Session
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

  // UPDATE Session
  const openEditSessionModal = (session: Session) => {
    setEditingSession(session);
    setEditSessionTitle(session.title);
    setEditSessionDate(session.date ? session.date.substring(0, 10) : "");
    setEditSessionError("");
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession || !editSessionTitle || !editSessionDate) return;
    setIsUpdatingSession(true);
    setEditSessionError("");

    try {
      const res = await fetch(`/api/sessions/${editingSession.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editSessionTitle,
          date: editSessionDate,
          adminPassword,
        }),
      });

      if (res.ok) {
        setEditingSession(null);
        await loadData();
      } else {
        const data = await res.json();
        setEditSessionError(data.error || "Gagal mengemaskini sesi.");
      }
    } catch {
      setEditSessionError("Ralat rangkaian ketika mengemaskini.");
    } finally {
      setIsUpdatingSession(false);
    }
  };

  // UPDATE Media
  const openEditMediaModal = (item: MediaItemWithSession) => {
    setEditingMedia(item);
    setEditMediaUploader(item.uploader_name || "");
    setEditMediaSessionId(item.session_id);
    setEditMediaError("");
  };

  const handleUpdateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia || !editMediaSessionId) return;
    setIsUpdatingMedia(true);
    setEditMediaError("");

    try {
      const res = await fetch(`/api/media/${editingMedia.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: editMediaSessionId,
          uploader_name: editMediaUploader,
          adminPassword,
        }),
      });

      if (res.ok) {
        setEditingMedia(null);
        if (previewItem && previewItem.id === editingMedia.id) {
          setPreviewItem(null);
        }
        await loadData();
      } else {
        const data = await res.json();
        setEditMediaError(data.error || "Gagal mengemaskini fail.");
      }
    } catch {
      setEditMediaError("Ralat rangkaian.");
    } finally {
      setIsUpdatingMedia(false);
    }
  };

  // DELETE (Session or Media)
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

      if (previewItem && previewItem.id === deleteConfirm.id) {
        setPreviewItem(null);
      }
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

  // ─── Login Screen ──────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-full max-w-sm animate-slide-up p-4">
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
              ← Kembali ke galeri utama
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
          <div className="flex items-center gap-2">
            <Link href="/upload" className="btn-secondary text-xs py-1.5 px-3">
              <Upload className="w-3.5 h-3.5" />
              Muat Naik
            </Link>
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
          <div className="animate-fade-in space-y-4">
            {/* Filter & View Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-stone-500">
                {filteredMedia.length} fail {selectedSession !== "all" ? "dalam sesi ini" : "keseluruhan"}
              </p>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="border border-stone-200 bg-white flex p-0.5">
                  <button
                    onClick={() => setMediaViewMode("table")}
                    className={`p-1.5 text-xs transition-colors ${
                      mediaViewMode === "table" ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-900"
                    }`}
                    title="Paparan Jadual"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setMediaViewMode("grid")}
                    className={`p-1.5 text-xs transition-colors ${
                      mediaViewMode === "grid" ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-900"
                    }`}
                    title="Paparan Petak Gambar"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Session Filter */}
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
            </div>

            {isLoading ? (
              <div className="space-y-px">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-stone-200 bg-white">
                <p className="text-stone-400 text-sm">Tiada fail ditemui.</p>
              </div>
            ) : mediaViewMode === "table" ? (
              /* ── TABLE VIEW WITH VISUAL THUMBNAILS ── */
              <div className="border border-stone-200 overflow-x-auto bg-white">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th style={{ width: "240px" }}>Media</th>
                      <th className="hidden md:table-cell">Sesi</th>
                      <th className="hidden sm:table-cell">Penyumbang</th>
                      <th className="hidden md:table-cell">Tarikh</th>
                      <th className="text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedia.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                        {/* Thumbnail & Type */}
                        <td>
                          <div className="flex items-center gap-3">
                            {/* Visual Thumbnail */}
                            <div
                              onClick={() => setPreviewItem(item)}
                              className="w-14 h-14 bg-stone-100 border border-stone-200 shrink-0 relative overflow-hidden cursor-pointer group"
                              title="Klik untuk pratonton penuh"
                            >
                              {item.file_type === "image" ? (
                                <Image
                                  src={item.file_url}
                                  alt=""
                                  fill
                                  className="object-cover group-hover:scale-110 transition-transform duration-200"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-stone-900 flex items-center justify-center relative">
                                  <video
                                    src={item.file_url}
                                    className="w-full h-full object-cover opacity-60"
                                    preload="metadata"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
                                      <Play className="w-3 h-3 text-stone-900 translate-x-0.5" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>

                            {/* Label & Details */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="tag capitalize text-[10px] py-0 px-1.5">
                                  {item.file_type}
                                </span>
                              </div>
                              <button
                                onClick={() => setPreviewItem(item)}
                                className="text-xs text-stone-600 hover:text-stone-900 font-medium underline-offset-2 hover:underline flex items-center gap-1"
                              >
                                Lihat fail
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Session */}
                        <td className="hidden md:table-cell">
                          <span className="text-stone-700 text-xs font-medium">
                            {item.sessions?.title ?? sessions.find((s) => s.id === item.session_id)?.title ?? "—"}
                          </span>
                        </td>

                        {/* Uploader */}
                        <td className="hidden sm:table-cell">
                          <span className="text-stone-600 text-xs">
                            {item.uploader_name ?? <span className="text-stone-300">—</span>}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="hidden md:table-cell">
                          <span className="text-stone-400 text-xs">
                            {new Date(item.created_at).toLocaleDateString("ms-MY")}
                          </span>
                        </td>

                        {/* Actions (CRUD: Edit, Download, Delete) */}
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn-ghost p-1.5"
                              title="Sunting Maklumat Fail (Edit)"
                              onClick={() => openEditMediaModal(item)}
                            >
                              <Pencil className="w-3.5 h-3.5 text-stone-600" />
                            </button>
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="btn-ghost p-1.5"
                              title="Muat Turun"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              className="btn-danger p-1.5"
                              title="Padam Fail"
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
            ) : (
              /* ── GRID VIEW WITH BIG VISUAL THUMBNAILS ── */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className="card-sm bg-white border border-stone-200 flex flex-col group p-2 hover:border-stone-900 transition-colors"
                  >
                    {/* Media Thumbnail */}
                    <div
                      onClick={() => setPreviewItem(item)}
                      className="aspect-square bg-stone-100 relative overflow-hidden cursor-pointer mb-2"
                    >
                      {item.file_type === "image" ? (
                        <Image
                          src={item.file_url}
                          alt=""
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-900 flex items-center justify-center relative">
                          <video
                            src={item.file_url}
                            className="w-full h-full object-cover opacity-60"
                            preload="metadata"
                          />
                          <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center z-10">
                            <Play className="w-3.5 h-3.5 text-stone-900 translate-x-0.5" />
                          </div>
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5">
                        <span className="tag text-[10px] py-0 px-1 bg-white/90 backdrop-blur-sm">
                          {item.file_type}
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 mb-2 px-1">
                      <p className="text-xs font-semibold text-stone-900 truncate">
                        {item.uploader_name || "Tanpa Nama"}
                      </p>
                      <p className="text-[11px] text-stone-400 truncate">
                        {item.sessions?.title ?? sessions.find((s) => s.id === item.session_id)?.title ?? "—"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-1.5 mt-auto">
                      <button
                        onClick={() => openEditMediaModal(item)}
                        className="btn-ghost p-1 text-stone-500 hover:text-stone-900"
                        title="Sunting (Edit)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-1">
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="btn-ghost p-1"
                          title="Muat Turun"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          className="btn-danger p-1"
                          title="Padam"
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Sessions (CRUD) ─────────────────────────────────── */}
        {activeTab === "sessions" && (
          <div className="animate-fade-in space-y-8">
            {/* Create Session Form (CREATE) */}
            <div className="card">
              <h2 className="heading-md mb-1">Tambah Sesi Program</h2>
              <p className="text-stone-400 text-sm mb-6">Cipta sesi program baharu untuk mengkategorikan media.</p>

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
                      Tarikh Sesi
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
                      Tambah Sesi
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Sessions List (READ, UPDATE, DELETE) */}
            {isLoading ? (
              <div className="space-y-px">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-200 bg-white">
                <p className="text-stone-400 text-sm">Tiada sesi lagi.</p>
              </div>
            ) : (
              <div className="border border-stone-200 overflow-hidden bg-white">
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
                        <tr key={session.id} className="hover:bg-stone-50 transition-colors">
                          <td className="font-medium text-stone-900">{session.title}</td>
                          <td className="hidden sm:table-cell text-stone-500 text-xs">
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
                            <div className="flex items-center justify-end gap-1.5">
                              {/* EDIT BUTTON (UPDATE) */}
                              <button
                                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1.5"
                                title="Sunting Sesi"
                                onClick={() => openEditSessionModal(session)}
                              >
                                <Pencil className="w-3 h-3 text-stone-600" />
                                <span>Edit</span>
                              </button>

                              {/* DELETE BUTTON (DELETE) */}
                              <button
                                className="btn-danger p-1.5 flex items-center gap-1.5 text-xs"
                                title="Padam Sesi"
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

      {/* ── MODAL: EDIT SESSION (UPDATE) ─────────────────────────── */}
      {editingSession && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center px-4 animate-fade-in"
          onClick={() => !isUpdatingSession && setEditingSession(null)}
        >
          <div
            className="bg-white border border-stone-200 w-full max-w-md p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900 text-base">Sunting Sesi Program</h3>
              <button
                onClick={() => setEditingSession(null)}
                className="text-stone-400 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSession} className="space-y-4">
              <div>
                <label className="label-base block mb-2" htmlFor="edit-session-title">
                  Tajuk Sesi
                </label>
                <input
                  id="edit-session-title"
                  type="text"
                  className="input-base"
                  value={editSessionTitle}
                  onChange={(e) => setEditSessionTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label-base block mb-2" htmlFor="edit-session-date">
                  Tarikh Sesi
                </label>
                <div className="relative">
                  <input
                    id="edit-session-date"
                    type="date"
                    className="input-base pr-10"
                    value={editSessionDate}
                    onChange={(e) => setEditSessionDate(e.target.value)}
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
              </div>

              {editSessionError && (
                <p className="text-xs text-red-600">{editSessionError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setEditingSession(null)}
                  disabled={isUpdatingSession}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={isUpdatingSession || !editSessionTitle || !editSessionDate}
                >
                  {isUpdatingSession ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT MEDIA (UPDATE) ───────────────────────────── */}
      {editingMedia && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center px-4 animate-fade-in"
          onClick={() => !isUpdatingMedia && setEditingMedia(null)}
        >
          <div
            className="bg-white border border-stone-200 w-full max-w-md p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900 text-base">Sunting Maklumat Fail</h3>
              <button
                onClick={() => setEditingMedia(null)}
                className="text-stone-400 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMedia} className="space-y-4">
              <div>
                <label className="label-base block mb-2" htmlFor="edit-media-session">
                  Pindah ke Sesi Program
                </label>
                <div className="relative">
                  <select
                    id="edit-media-session"
                    className="select-base pr-10"
                    value={editMediaSessionId}
                    onChange={(e) => setEditMediaSessionId(e.target.value)}
                    required
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="label-base block mb-2" htmlFor="edit-media-uploader">
                  Nama Penyumbang / Kumpulan
                </label>
                <input
                  id="edit-media-uploader"
                  type="text"
                  className="input-base"
                  placeholder="cth: Unit Jurufoto, Ahmad"
                  value={editMediaUploader}
                  onChange={(e) => setEditMediaUploader(e.target.value)}
                />
              </div>

              {editMediaError && (
                <p className="text-xs text-red-600">{editMediaError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setEditingMedia(null)}
                  disabled={isUpdatingMedia}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={isUpdatingMedia}
                >
                  {isUpdatingMedia ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PREVIEW ITEM (ADMIN LIGHTBOX) ─────────────────── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/95 flex flex-col animate-fade-in"
          onClick={() => setPreviewItem(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0 bg-stone-900/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-sm text-stone-200 font-semibold">
                {previewItem.uploader_name || "Tanpa Nama"}
              </p>
              <p className="text-xs text-stone-400">
                {previewItem.sessions?.title ?? sessions.find((s) => s.id === previewItem.session_id)?.title} •{" "}
                {new Date(previewItem.created_at).toLocaleString("ms-MY")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={previewItem.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="btn-secondary text-xs py-1 px-3 bg-white/10 text-white border-white/20 hover:bg-white hover:text-stone-900"
              >
                <Download className="w-3.5 h-3.5" />
                Muat Turun
              </a>
              <button
                className="p-1.5 text-stone-400 hover:text-white"
                onClick={() => setPreviewItem(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Full Content */}
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {previewItem.file_type === "image" ? (
              <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
                <Image
                  src={previewItem.file_url}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="100vw"
                  unoptimized
                />
              </div>
            ) : (
              <video
                src={previewItem.file_url}
                controls
                autoPlay
                className="max-w-5xl w-full max-h-full"
              />
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE CONFIRMATION ───────────────────────────── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center px-4 animate-fade-in"
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

      <footer className="border-t border-stone-200 mt-12 bg-white">
        <div className="container-main py-4 text-center">
          <p className="text-xs text-stone-400">Admin Dashboard — Event Media Drop Portal</p>
        </div>
      </footer>
    </div>
  );
}
