import { NextRequest, NextResponse } from "next/server";
import { deleteSubmission } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { kelas, kelompok } = await request.json();

    if (!kelas || !kelompok) {
      return NextResponse.json({ error: "Kelas dan kelompok diperlukan" }, { status: 400 });
    }

    await deleteSubmission(kelas, kelompok);
    return NextResponse.json({ success: true, message: `Data ${kelas} - ${kelompok} berhasil direset.` });
  } catch (err: any) {
    console.error("API reset error:", err);
    return NextResponse.json({ error: "Gagal mereset data kelompok" }, { status: 500 });
  }
}
