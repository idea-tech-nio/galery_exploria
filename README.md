# Event Media Drop Portal

Platform muat naik media kolaboratif berasaskan sesi program. Dibangunkan dengan **Next.js 15**, **TypeScript**, **Tailwind CSS**, dan **Supabase**.

---

## Struktur Fail Projek

```
project-galery/
├── app/
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global CSS design system
│   ├── page.tsx                 # Halaman muat naik awam (/)
│   ├── gallery/
│   │   ├── layout.tsx
│   │   └── page.tsx             # Galeri media (/gallery)
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx             # Panel admin (/admin)
│   └── api/
│       ├── sessions/            # GET / POST / DELETE sesi
│       ├── media/               # GET / POST / DELETE media
│       ├── upload/              # POST muat naik fail ke Storage
│       └── admin/auth/          # POST sahkan kata laluan admin
├── lib/
│   └── supabase.ts              # Konfigurasi Supabase + Types
├── supabase/migrations/
│   └── 001_initial_schema.sql   # Skema pangkalan data lengkap
├── .env.local.example           # Template pemboleh ubah
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Setup

### 1. Install Node.js
Muat turun dari https://nodejs.org (v18+)

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Supabase

**a. Cipta Projek**
1. Pergi ke https://supabase.com dan daftar
2. Klik New Project, isi nama & kata laluan database

**b. Jalankan SQL Migration**
1. Supabase Dashboard → SQL Editor
2. Salin kandungan `supabase/migrations/001_initial_schema.sql`
3. Tampal dan klik Run

**c. Dapatkan API Keys**
Supabase Dashboard → Project Settings → API:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Tetapkan Environment Variables

Salin template:
```bash
copy .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ADMIN_PASSWORD=kata-laluan-anda
```

> JANGAN komit .env.local ke Git!

### 5. Jalankan Secara Tempatan
```bash
npm run dev
```
Buka: http://localhost:3000

---

## Halaman Aplikasi

| Laluan | Penerangan |
|--------|-----------|
| `/` | Muat naik media — pilih sesi, seret fail, hantar |
| `/gallery` | Galeri grid — tapis sesi, lightbox modal |
| `/admin` | Panel admin — urus sesi & fail |

---

## Deploy ke Vercel

1. Push ke GitHub
2. Import projek di https://vercel.com
3. Tambah 4 environment variables (sama seperti .env.local)
4. Deploy!

---

## Skema Database

**sessions** — `id, title, date, created_at`

**media_items** — `id, session_id, file_url, file_type, uploader_name, created_at`

---

## Format Fail Disokong

- Gambar: JPG, PNG, WEBP
- Video: MP4, MOV
- Had saiz: 500 MB per fail

---

## Selesaikan Masalah

| Masalah | Penyelesaian |
|---------|-------------|
| "Tiada sesi tersedia" | Pastikan SQL migration telah dijalankan |
| Muat naik gagal | Semak bucket `media-uploads` wujud di Storage |
| Admin tidak boleh log masuk | Semak `ADMIN_PASSWORD` dalam `.env.local` |
