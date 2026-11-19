import { NextRequest, NextResponse } from "next/server";
import { getSubmission } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const kelas = searchParams.get("kelas");
  const kelompok = searchParams.get("kelompok");

  if (!kelas || !kelompok) {
    return NextResponse.json({ error: "Parameter kelas dan kelompok harus diisi." }, { status: 400 });
  }

  try {
    const submission = await getSubmission(kelas, kelompok);
    if (submission) {
      return NextResponse.json({ exists: true, submission });
    }
    return NextResponse.json({ exists: false });
  } catch (err: any) {
    console.error("API check error:", err);
    return NextResponse.json({ error: "Gagal memeriksa status kelompok." }, { status: 500 });
  }
}
