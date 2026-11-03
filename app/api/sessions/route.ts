import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/sessions]", err);
    return NextResponse.json({ error: "Gagal memuatkan sesi." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
      .insert({ title, date })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sessions]", err);
    return NextResponse.json({ error: "Gagal mencipta sesi." }, { status: 500 });
  }
}
