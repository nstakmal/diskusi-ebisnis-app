import { NextRequest, NextResponse } from "next/server";
import { getAllSubmissions, getSubmission, saveSubmission } from "@/lib/db";
import { Submission } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getAllSubmissions();
    return NextResponse.json({ submissions: list });
  } catch (err: any) {
    console.error("API GET submissions error:", err);
    return NextResponse.json({ error: "Gagal mengambil data submissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<Submission> = await request.json();

    if (!body.kelas || !body.kelompok || !body.anggota) {
      return NextResponse.json(
        { error: "Kelas, kelompok, dan nama anggota wajib diisi!" },
        { status: 400 }
      );
    }

    // Check if already submitted
    const existing = await getSubmission(body.kelas, body.kelompok);
    if (existing) {
      return NextResponse.json(
        {
          error: "Kelompok ini sudah mengirimkan lembar jawaban sebelumnya! Status pengerjaan terkunci.",
          existing,
        },
        { status: 409 }
      );
    }

    const newSub: Submission = {
      id: body.id || `SUB-${Date.now()}`,
      kelas: body.kelas,
      kelompok: body.kelompok,
      anggota: body.anggota,
      jawabanKasus1: body.jawabanKasus1 || "(Tidak diisi)",
      jawabanKasus2: body.jawabanKasus2 || "(Tidak diisi)",
      submittedAt: new Date().toLocaleString("id-ID", {
        dateStyle: "full",
        timeStyle: "medium",
      }),
      status: "Terkunci / Selesai",
    };

    await saveSubmission(newSub);

    return NextResponse.json({
      success: true,
      message: "Jawaban kelompok berhasil disimpan dan dikunci.",
      submission: newSub,
    });
  } catch (err: any) {
    console.error("API POST submission error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server saat menyimpan jawaban." }, { status: 500 });
  }
}
