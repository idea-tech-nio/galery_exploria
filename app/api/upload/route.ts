import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("session_id") as string;

    if (!file || !sessionId) {
      return NextResponse.json({ error: "Fail dan sesi diperlukan." }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Jenis fail tidak disokong." }, { status: 400 });
    }

    // Max 500MB
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: "Saiz fail melebihi 500MB." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Generate unique path
    const ext = file.name.split(".").pop();
    const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("media-uploads")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("media-uploads")
      .getPublicUrl(fileName);

    const fileType = file.type.startsWith("video") ? "video" : "image";

    return NextResponse.json({
      file_url: publicUrlData.publicUrl,
      file_type: fileType,
      file_name: file.name,
    });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Muat naik gagal." }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
