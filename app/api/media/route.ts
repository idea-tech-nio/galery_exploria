import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("media_items")
      .select("*, sessions(id, title, date)")
      .order("created_at", { ascending: false });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/media]", err);
    return NextResponse.json({ error: "Gagal memuatkan media." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, file_url, file_type, uploader_name } = body;

    if (!session_id || !file_url || !file_type) {
      return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("media_items")
      .insert({ session_id, file_url, file_type, uploader_name: uploader_name || null })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[POST /api/media]", err);
    return NextResponse.json({ error: "Gagal menyimpan rekod media." }, { status: 500 });
  }
}
