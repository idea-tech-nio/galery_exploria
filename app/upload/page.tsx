"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Upload,
  CheckCircle,
  X,
  FileImage,
  FileVideo,
  ChevronDown,
  ArrowRight,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { supabase, type Session } from "@/lib/supabase";

type UploadFile = {
  file: File;
  id: string;
  status: "pending" | "compressing" | "uploading" | "done" | "error";
  progress: number;
  errorMsg?: string;
};

// Client-side smart image compression (jimat ruang 85-90% tanpa jejas kualiti skrin)
async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("gif") || file.type.includes("svg")) {
    return file;
  }
  // Sekiranya fail sudah bawah 800 KB, tidak perlu mampat lagi
  if (file.size < 800 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const MAX_DIMENSION = 2560; // Resolusi tajam 2.5K
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              const newName = file.name.replace(/\.[^/.]+$/, ".jpg");
              const compressedFile = new File([blob], newName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          "image/jpeg",
          0.85 // Kualiti 85% — bersih & tajam
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export default function UploadPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [uploaderName, setUploaderName] = useState<string>("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [globalError, setGlobalError] = useState<string>("");
  const [optimizeImages, setOptimizeImages] = useState<boolean>(true);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: Session[]) => {
        if (Array.isArray(data)) {
          setSessions(data);
          if (data.length > 0) setSelectedSession(data[0].id);
        }
      })
      .catch(() => setGlobalError("Gagal memuatkan senarai sesi."));
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
    const validated: UploadFile[] = Array.from(newFiles)
      .filter((f) => allowed.includes(f.type))
      .map((f) => ({
        file: f,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        status: "pending",
        progress: 0,
      }));
    setFiles((prev) => [...prev, ...validated]);
    setAllDone(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingle = async (uploadFile: UploadFile): Promise<void> => {
    try {
      let fileToUpload = uploadFile.file;

      if (optimizeImages && fileToUpload.type.startsWith("image/")) {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "compressing", progress: 20 } : f))
        );
        fileToUpload = await compressImageFile(fileToUpload);
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading", progress: 40 } : f))
      );

      const ext = fileToUpload.name.split(".").pop() || "jpg";
      const fileName = `${selectedSession}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media-uploads")
        .upload(fileName, fileToUpload, {
          contentType: fileToUpload.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Muat naik storan gagal.");
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 80 } : f))
      );

      const { data: publicUrlData } = supabase.storage
        .from("media-uploads")
        .getPublicUrl(fileName);

      const fileType = fileToUpload.type.startsWith("video") ? "video" : "image";

      const mediaRes = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSession,
          file_url: publicUrlData.publicUrl,
          file_type: fileType,
          uploader_name: uploaderName.trim() || null,
        }),
      });

      if (!mediaRes.ok) {
        const err = await mediaRes.json();
        throw new Error(err.error || "Gagal simpan rekod media.");
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "done", progress: 100 } : f))
      );
      setCompletedCount((prev) => prev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ralat tidak diketahui.";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "error", progress: 0, errorMsg: msg } : f
        )
      );
    }
  };

  const handleSubmit = async () => {
    if (!selectedSession || files.length === 0) return;
    setIsSubmitting(true);
    setGlobalError("");
    setCompletedCount(0);

    const pending = files.filter((f) => f.status === "pending" || f.status === "error");
    const CONCURRENCY = 3;
    const queue = [...pending];

    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await uploadSingle(item);
        }
      }
    });

    await Promise.all(workers);

    setIsSubmitting(false);
    setAllDone(true);
  };

  const handleReset = () => {
    setFiles([]);
    setAllDone(false);
    setUploaderName("");
    setCompletedCount(0);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pendingCount = files.filter((f) => f.status === "pending" || f.status === "error").length;
  const totalFiles = files.length;
  const totalOriginalBytes = files.reduce((acc, f) => acc + f.file.size, 0);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="container-main py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="btn-ghost p-1.5 -ml-1 text-stone-500 hover:text-stone-900" title="Kembali ke Galeri">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-8 h-8 bg-stone-900 flex items-center justify-center">
              <Upload className="w-4 h-4 text-stone-50" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-stone-900">
              Media Drop Portal
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/" className="btn-ghost text-xs">
              Galeri
            </Link>
            <Link href="/admin" className="btn-secondary text-xs px-3 py-1.5">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="container-narrow page-section animate-fade-in">
        {/* Hero */}
        <div className="mb-10">
          <p className="label-base mb-3">Platform Muat Naik Gambar</p>
          <h1 className="heading-xl">
            Hantar Gambar Program
          </h1>
        </div>

        {globalError && (
          <div className="mb-6 p-4 border border-stone-300 bg-stone-100 text-stone-700 text-sm flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" />
            {globalError}
          </div>
        )}

        {allDone && files.every((f) => f.status === "done") ? (
          /* Success State */
          <div className="animate-slide-up">
            <div className="card text-center py-16">
              <CheckCircle className="w-12 h-12 text-stone-900 mx-auto mb-4" />
              <h2 className="heading-md mb-2">Berjaya!</h2>
              <p className="text-stone-500 text-sm mb-8">
                Kesemua {files.length} fail telah dimuat naik dengan selamat ke dalam arkib.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleReset} className="btn-primary">
                  Muat Naik Lagi
                </button>
                <Link href="/" className="btn-secondary inline-flex items-center gap-2">
                  Lihat di Galeri <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            {/* Session Selector */}
            <div>
              <label className="label-base block mb-2" htmlFor="session-select">
                Sesi Program
              </label>
              <div className="relative">
                <select
                  id="session-select"
                  className="select-base pr-10"
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  disabled={sessions.length === 0}
                >
                  {sessions.length === 0 ? (
                    <option value="">Tiada sesi tersedia</option>
                  ) : (
                    sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {new Date(s.date).toLocaleDateString("ms-MY", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Uploader Name */}
            <div>
              <label className="label-base block mb-2" htmlFor="uploader-name">
                Nama / Kumpulan{" "}
                <span className="normal-case font-normal text-stone-400">(pilihan)</span>
              </label>
              <input
                id="uploader-name"
                type="text"
                className="input-base"
                placeholder="cth: Unit Jurufoto, Ahmad Zaki"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
              />
            </div>

            {/* Drop Zone */}
            <div>
              <label className="label-base block mb-2">Fail Media</label>
              <div
                className={`relative border-2 border-dashed transition-colors duration-200 cursor-pointer
                  ${isDragging
                    ? "border-stone-900 bg-stone-100"
                    : "border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50"
                  }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                aria-label="Kawasan seret dan lepas fail"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-input"
                  className="hidden"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
                <div className="py-12 px-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 border border-stone-200 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-stone-400" />
                  </div>
                  <p className="text-stone-800 font-medium text-sm mb-1">
                    Seret & lepas atau klik untuk pilih gambar / video
                  </p>
                  <p className="text-stone-400 text-xs">
                    Menyokong pemilihan beratus-ratus keping fail serentak
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Compression Option */}
            <div className="card-sm bg-white border border-stone-200 flex items-start gap-3">
              <input
                type="checkbox"
                id="optimize-toggle"
                checked={optimizeImages}
                onChange={(e) => setOptimizeImages(e.target.checked)}
                className="mt-1 h-4 w-4 rounded-none border-stone-300 text-stone-900 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="optimize-toggle" className="text-xs text-stone-700 cursor-pointer flex-1">
                <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-stone-900" />
                  Optimumkan Saiz Gambar Automatik (Disyorkan)
                </span>
                Mengecilkan saiz fail kamera mentah (~85% penjimatan) sambil mengekalkan ketajaman resolusi tinggi (2.5K). Membolehkan ratusan gambar dimuat naik dengan pantas dan jimat kuota storan.
              </label>
            </div>

            {/* Overall Progress when Submitting */}
            {isSubmitting && (
              <div className="card-sm bg-white border border-stone-900 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-900">
                    Memproses muat naik...
                  </span>
                  <span className="text-stone-500">
                    {completedCount} / {totalFiles} fail ({totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-1.5 bg-stone-100 w-full overflow-hidden">
                  <div
                    className="h-full bg-stone-900 transition-all duration-300"
                    style={{ width: `${totalFiles > 0 ? (completedCount / totalFiles) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="label-base">
                    {files.length} fail dipilih ({formatSize(totalOriginalBytes)})
                  </p>
                  <button
                    onClick={() => setFiles([])}
                    disabled={isSubmitting}
                    className="btn-ghost text-xs py-1 px-2"
                  >
                    Padam semua
                  </button>
                </div>

                <div className="border border-stone-200 divide-y divide-stone-100 max-h-80 overflow-y-auto">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                      {/* Icon */}
                      <div className="shrink-0">
                        {f.file.type.startsWith("video") ? (
                          <FileVideo className="w-4 h-4 text-stone-400" />
                        ) : (
                          <FileImage className="w-4 h-4 text-stone-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-800 truncate font-medium">
                          {f.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-stone-400">{formatSize(f.file.size)}</span>
                          {f.status === "compressing" && (
                            <span className="text-[11px] text-stone-500">Mengoptimumkan...</span>
                          )}
                          {f.status === "uploading" && (
                            <span className="text-[11px] text-stone-500">Memuat naik...</span>
                          )}
                          {f.status === "done" && (
                            <span className="text-[11px] text-stone-700 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-stone-900" /> Selesai
                            </span>
                          )}
                          {f.status === "error" && (
                            <span className="text-[11px] text-red-600">{f.errorMsg}</span>
                          )}
                        </div>
                        {/* Progress Bar */}
                        {(f.status === "uploading" || f.status === "compressing") && (
                          <div className="mt-1 h-0.5 bg-stone-100 w-full">
                            <div
                              className="h-full bg-stone-900 transition-all duration-300"
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Remove button */}
                      {!isSubmitting && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                          className="shrink-0 p-1 text-stone-300 hover:text-stone-700 transition-colors"
                          aria-label="Buang fail"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                id="submit-button"
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedSession || pendingCount === 0}
                className="btn-primary w-full justify-center py-3"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-stone-400 border-t-stone-50 rounded-full animate-spin" />
                    Memuat Naik ({completedCount} / {totalFiles})...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Hantar {pendingCount > 0 ? `(${pendingCount} Fail)` : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-auto">
        <div className="container-main py-6 flex items-center justify-between">
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} Event Media Drop Portal
          </p>
          <Link href="/" className="text-xs text-stone-400 hover:text-stone-900 transition-colors">
            Lihat Galeri →
          </Link>
        </div>
      </footer>
    </div>
  );
}

