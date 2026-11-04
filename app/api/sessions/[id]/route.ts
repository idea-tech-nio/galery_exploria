import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { adminPassword } = body;

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch media items to delete from storage first
    const { data: mediaItems } = await supabase
      .from("media_items")
      .select("file_url")
      .eq("session_id", id);

    // Delete files from storage bucket
    if (mediaItems && mediaItems.length > 0) {
      const paths = mediaItems.map((item) => {
        const url = new URL(item.file_url);
        const pathParts = url.pathname.split("/media-uploads/");
        return pathParts[1] ?? "";
      }).filter(Boolean);

      if (paths.length > 0) {
        await supabase.storage.from("media-uploads").remove(paths);
      }
    }

    // Delete session (cascades to media_items)
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/sessions/:id]", err);
    return NextResponse.json({ error: "Gagal memadam sesi." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, date, adminPassword } = body;

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 401 });
    }

    if (!title || !date) {
      return NextResponse.json({ error: "Tajuk dan tarikh diperlukan." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("sessions")
      .update({ title, date })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[PUT /api/sessions/:id]", err);
    return NextResponse.json({ error: "Gagal mengemaskini sesi." }, { status: 500 });
  }
}
