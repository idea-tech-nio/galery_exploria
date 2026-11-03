-- ============================================================
-- EVENT MEDIA DROP PORTAL — Supabase Migration
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: media_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.media_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id     UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  file_url       TEXT NOT NULL,
  file_type      TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  uploader_name  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_items_session_id ON public.media_items(session_id);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON public.media_items(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone can read
DROP POLICY IF EXISTS "sessions_select_public" ON public.sessions;
CREATE POLICY "sessions_select_public"
  ON public.sessions FOR SELECT
  USING (true);

-- Sessions: only service role can insert/update/delete
DROP POLICY IF EXISTS "sessions_insert_service" ON public.sessions;
CREATE POLICY "sessions_insert_service"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "sessions_delete_service" ON public.sessions;
CREATE POLICY "sessions_delete_service"
  ON public.sessions FOR DELETE
  USING (auth.role() = 'service_role');

-- Media items: anyone can read
DROP POLICY IF EXISTS "media_items_select_public" ON public.media_items;
CREATE POLICY "media_items_select_public"
  ON public.media_items FOR SELECT
  USING (true);

-- Media items: anyone can insert (public upload)
DROP POLICY IF EXISTS "media_items_insert_public" ON public.media_items;
CREATE POLICY "media_items_insert_public"
  ON public.media_items FOR INSERT
  WITH CHECK (true);

-- Media items: only service role can delete
DROP POLICY IF EXISTS "media_items_delete_service" ON public.media_items;
CREATE POLICY "media_items_delete_service"
  ON public.media_items FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================
-- STORAGE BUCKET: media-uploads
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-uploads',
  'media-uploads',
  true,
  524288000, -- 500MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "storage_select_public" ON storage.objects;
CREATE POLICY "storage_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-uploads');

DROP POLICY IF EXISTS "storage_insert_public" ON storage.objects;
CREATE POLICY "storage_insert_public"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media-uploads');

DROP POLICY IF EXISTS "storage_delete_service" ON storage.objects;
CREATE POLICY "storage_delete_service"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media-uploads' AND auth.role() = 'service_role');

-- ============================================================
-- SAMPLE DATA (Optional — remove before production)
-- ============================================================
INSERT INTO public.sessions (title, date) VALUES
  ('Majlis Anugerah Cemerlang 2025', '2025-01-15'),
  ('Bengkel Inovasi Digital', '2025-03-22'),
  ('Mesyuarat Agung Tahunan', '2025-06-10')
ON CONFLICT DO NOTHING;
