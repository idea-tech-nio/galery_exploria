import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password === process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Kata laluan salah." }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Ralat pelayan." }, { status: 500 });
  }
}
