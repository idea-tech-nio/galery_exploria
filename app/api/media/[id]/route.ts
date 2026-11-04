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

    // Get file URL before deleting
    const { data: item } = await supabase
      .from("media_items")
      .select("file_url")
      .eq("id", id)
      .single();

    if (item?.file_url) {
      const url = new URL(item.file_url);
      const pathParts = url.pathname.split("/media-uploads/");
      const storagePath = pathParts[1];
      if (storagePath) {
        await supabase.storage.from("media-uploads").remove([storagePath]);
      }
    }

    const { error } = await supabase
      .from("media_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/media/:id]", err);
    return NextResponse.json({ error: "Gagal memadam fail." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { session_id, uploader_name, adminPassword } = body;

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const updatePayload: { session_id?: string; uploader_name?: string | null } = {};
    if (session_id) updatePayload.session_id = session_id;
    if (uploader_name !== undefined) updatePayload.uploader_name = uploader_name ? uploader_name.trim() : null;

    const { data, error } = await supabase
      .from("media_items")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[PUT /api/media/:id]", err);
    return NextResponse.json({ error: "Gagal mengemaskini fail." }, { status: 500 });
  }
}
