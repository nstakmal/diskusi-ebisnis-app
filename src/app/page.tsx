"use client";

import React, { useState, useEffect, useRef } from "react";
import { Submission } from "@/types";
import {
  Clock,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Copy,
  ChevronRight,
  RefreshCw,
  Download,
  BookOpen,
  Users,
  ShieldCheck,
  Building2,
  Wheat,
} from "lucide-react";

const DURATION_SECONDS = 10 * 60; // 10 minutes per case

export default function DiskusiEBisnisPage() {
  // Stepper: 1: Identitas, 2: Kasus 1, 3: Kasus 2, 4: Review/Terkunci
  const [step, setStep] = useState<number>(1);

  // Form State
  const [kelas, setKelas] = useState<string>("");
  const [kelompok, setKelompok] = useState<string>("");
  const [anggota, setAnggota] = useState<string>("");
  const [jawabanK1, setJawabanK1] = useState<string>("");
  const [jawabanK2, setJawabanK2] = useState<string>("");

  // Lock & Checking State
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState<boolean>(false);
  const [lockedSubmission, setLockedSubmission] = useState<Submission | null>(null);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(DURATION_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Admin state
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [adminList, setAdminList] = useState<Submission[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(false);

  // Play audio beep alert
  const playBeep = (freq = 600, duration = 200) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    } catch {
      // Audio might be blocked before first user gesture
    }
  };

  // Realtime Check on Kelas or Kelompok change
  useEffect(() => {
    if (!kelas || !kelompok) {
      setAlreadySubmitted(false);
      setLockedSubmission(null);
      return;
    }

    async function checkStatus() {
      setIsChecking(true);
      try {
        const res = await fetch(`/api/check?kelas=${encodeURIComponent(kelas)}&kelompok=${encodeURIComponent(kelompok)}`);
        const data = await res.json();
        if (data.exists && data.submission) {
          setAlreadySubmitted(true);
          setLockedSubmission(data.submission);
        } else {
          setAlreadySubmitted(false);
          setLockedSubmission(null);
        }
      } catch (err) {
        console.error("Check status failed:", err);
      } finally {
        setIsChecking(false);
      }
    }

    checkStatus();
  }, [kelas, kelompok]);

  // Timer countdown handler
  useEffect(() => {
    if (step === 2 || step === 3) {
      setTimerSeconds(DURATION_SECONDS);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev === 120) playBeep(520, 300);
          if (prev === 30) playBeep(780, 400);

          if (prev <= 1) {
            clearInterval(timerRef.current!);
            playBeep(880, 600);
            if (step === 2) {
              alert("Waktu 10 menit untuk Studi Kasus 1 telah berakhir! Otomatis pindah ke Kasus 2.");
              setStep(3);
            } else if (step === 3) {
              alert("Waktu 10 menit untuk Studi Kasus 2 telah berakhir! Sistem otomatis mengunci dan mengirim jawaban.");
              handleFinalSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  // Handle Start
  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelas || !kelompok || !anggota.trim()) {
      alert("Lengkapi Kelas, Nomor Kelompok, dan Anggota terlebih dahulu!");
      return;
    }
    if (alreadySubmitted && lockedSubmission) {
      setStep(4);
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit Final
  const handleFinalSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const payload = {
      kelas,
      kelompok,
      anggota,
      jawabanKasus1: jawabanK1.trim() || "(Tidak diisi)",
      jawabanKasus2: jawabanK2.trim() || "(Tidak diisi)",
    };

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.submission) {
        setLockedSubmission(result.submission);
        setStep(4);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (result.existing) {
        alert("Kelompok ini sudah pernah submit sebelumnya!");
        setLockedSubmission(result.existing);
        setStep(4);
      } else {
        alert(result.error || "Gagal menyimpan jawaban.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Terjadi kesalahan jaringan saat mengirimkan jawaban.");
    }
  };

  // Admin Data Fetch
  const fetchAdminList = async () => {
    setIsLoadingAdmin(true);
    try {
      const res = await fetch("/api/submissions");
      const data = await res.json();
      setAdminList(data.submissions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const handleResetGroup = async (k: string, kel: string) => {
    if (confirm(`Reset status ${k} - ${kel}? Kelompok ini akan diizinkan mengisi ulang.`)) {
      try {
        await fetch("/api/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kelas: k, kelompok: kel }),
        });
        fetchAdminList();
        if (kelas === k && kelompok === kel) {
          setAlreadySubmitted(false);
          setLockedSubmission(null);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const exportCSV = () => {
    if (adminList.length === 0) return alert("Belum ada data.");
    let csv = "No,Kelas,Kelompok,Waktu Submit,Anggota,Jawaban Kasus 1,Jawaban Kasus 2\n";
    adminList.forEach((item, idx) => {
      const a = `"${(item.anggota || "").replace(/"/g, '""').replace(/\n/g, " | ")}"`;
      const j1 = `"${(item.jawabanKasus1 || "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
      const j2 = `"${(item.jawabanKasus2 || "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
      csv += `${idx + 1},"${item.kelas}","${item.kelompok}","${item.submittedAt}",${a},${j1},${j2}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rekap_Diskusi_EBisnis_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!lockedSubmission) return;
    const txt = `=== LEMBAR JAWABAN DISKUSI E-BISNIS ===\nUniversitas Royal Kisaran\n\nKelas: ${lockedSubmission.kelas}\nKelompok: ${lockedSubmission.kelompok}\nWaktu: ${lockedSubmission.submittedAt}\nAnggota:\n${lockedSubmission.anggota}\n\n[JAWABAN KASUS 1]\n${lockedSubmission.jawabanKasus1}\n\n[JAWABAN KASUS 2]\n${lockedSubmission.jawabanKasus2}`;
    navigator.clipboard.writeText(txt).then(() => alert("Berhasil disalin ke clipboard!"));
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-900 to-blue-800 text-white shadow-lg px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center font-black text-amber-400 text-xl shadow-inner">
              UR
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wide uppercase leading-tight">
                Latihan Diskusi Kelompok — E-Bisnis
              </h1>
              <p className="text-xs text-blue-200">
                Prodi Sistem Informasi • Universitas Royal Kisaran
              </p>
            </div>
          </div>

          {(step === 2 || step === 3) && (
            <div
              className={`flex items-center gap-3 px-4 py-1.5 rounded-full border transition-all ${
                timerSeconds <= 60
                  ? "bg-red-500/20 border-red-400 animate-pulse text-red-200"
                  : timerSeconds <= 180
                  ? "bg-amber-500/20 border-amber-400 text-amber-200"
                  : "bg-slate-800/80 border-slate-700 text-white"
              }`}
            >
              <Clock className="w-4 h-4" />
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Sisa Waktu Kasus {step === 2 ? "1" : "2"}
                </div>
                <div className="font-mono text-xl font-extrabold tracking-widest leading-none">
                  {formatTimer(timerSeconds)}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1">
        {/* Stepper Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { num: 1, label: "Identitas" },
            { num: 2, label: "Kasus 1" },
            { num: 3, label: "Kasus 2" },
            { num: 4, label: "Selesai" },
          ].map((s, idx, arr) => (
            <React.Fragment key={s.num}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  step === s.num
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : step > s.num
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-white text-slate-400 border border-slate-200"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    step === s.num
                      ? "bg-white text-blue-600"
                      : step > s.num
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {s.num}
                </div>
                <span>{s.label}</span>
              </div>
              {idx < arr.length - 1 && <div className="w-4 h-[2px] bg-slate-300" />}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 1: IDENTITAS & REGISTRASI */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 transition-all">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 mb-3">
              <BookOpen className="w-3.5 h-3.5" /> Formulir Registrasi Kelompok
            </span>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Latihan Analisis Studi Kasus E-Bisnis
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Silakan pilih kelas, nomor kelompok, dan isi anggota Anda. Setiap kelompok hanya berhak mengisi <strong>1 kali</strong>.
            </p>

            {/* Alert if already submitted */}
            {alreadySubmitted && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start gap-3 mb-6 animate-fadeIn">
                <Lock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm">Kelompok Anda Sudah Mengirimkan Jawaban!</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    Status pengerjaan kelompok Anda telah <strong>TERKUNCI</strong> pada database. Anda tidak dapat mengisi kembali, namun dapat melihat rekap jawaban yang telah dikirimkan.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                  >
                    👁️ Lihat Hasil Lembar Jawaban
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleStartExam} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Pilih Kelas E-Bisnis <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="" disabled>-- Pilih Kelas --</option>
                    <option value="Ebisnis 4">Ebisnis 4</option>
                    <option value="Ebisnis 5">Ebisnis 5</option>
                    <option value="Ebisnis 6">Ebisnis 6</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Pilih Nomor Kelompok <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={kelompok}
                    onChange={(e) => setKelompok(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="" disabled>-- Pilih Kelompok --</option>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={`Kelompok ${n}`}>Kelompok {n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Daftar Nama & NIM Anggota Kelompok <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={anggota}
                  onChange={(e) => setAnggota(e.target.value)}
                  required
                  placeholder="Contoh:&#10;1. 22220101 - Ahmad Fajar (Ketua)&#10;2. 22220102 - Siti Nurhaliza&#10;3. 22220103 - Budi Santoso"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm leading-relaxed"
                />
              </div>

              {/* Informational Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                  <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800">2 Soal Kasus Nyata</h5>
                    <p className="text-[11px] text-slate-500 leading-snug">Kuliner cepat saji lokal & komoditas salak Buntu Pane.</p>
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800">10 Menit / Kasus</h5>
                    <p className="text-[11px] text-slate-500 leading-snug">Total 20 menit pengerjaan langsung di formulir.</p>
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800">Kunci Permanen</h5>
                    <p className="text-[11px] text-slate-500 leading-snug">Setelah submit, kelompok tidak bisa mengisi lagi.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between flex-wrap gap-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {isChecking ? "Memeriksa status kelompok..." : "Pastikan seluruh anggota sudah hadir & siap berdiskusi."}
                </span>
                <button
                  type="submit"
                  disabled={alreadySubmitted || isChecking}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center gap-2"
                >
                  <span>Mulai Diskusi & Kasus 1</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: STUDI KASUS 1 */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 transition-all">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                <Building2 className="w-3.5 h-3.5" /> Kasus 1 dari 2 • Alokasi 10 Menit
              </span>
              <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {kelas} • {kelompok}
              </span>
            </div>

            {/* Timer Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
              <div
                className={`h-full transition-all duration-1000 ${
                  timerSeconds <= 60
                    ? "bg-red-500"
                    : timerSeconds <= 180
                    ? "bg-amber-500"
                    : "bg-blue-600"
                }`}
                style={{ width: `${(timerSeconds / DURATION_SECONDS) * 100}%` }}
              />
            </div>

            {/* Narrative */}
            <div className="bg-slate-50 border-l-4 border-blue-600 border-y border-r border-slate-200 rounded-xl p-5 mb-6 text-sm text-slate-700 leading-relaxed">
              <div className="text-[11px] font-black uppercase text-blue-600 tracking-wider mb-1">
                Sektor Kuliner Cepat Saji Lokal
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">
                Warung Ayam Geprek 'Crispy Asahan' di Jalan Cokroaminoto
              </h3>
              <p className="mb-2">
                Warung makan <strong>"Ayam Geprek Crispy Asahan"</strong> memiliki sambal khas berbahan cabai lokal yang sangat digemari mahasiswa dan pekerja kantor di Kisaran. Saat jam makan siang (pukul 11.30 s/d 13.30), warung selalu dipadati pembeli hingga antrean mengular ke bahu jalan. Namun, pemilik menghadapi masalah serius: kapasitas ruko sewaannya hanya memuat 6 meja (maksimal 24 kursi makan di tempat).
              </p>
              <p>
                Banyak pelanggan akhirnya batal membeli karena malas menunggu kursi kosong. Pemilik berniat menambah meja, tetapi menyewa ruko sebelah membutuhkan biaya sewa Rp 35.000.000 per tahun yang tidak sanggup ia bayar. Selain itu, pesanan via WhatsApp sering terlewat karena karyawan dapur sibuk menggoreng ayam sehingga balasan pesan sering terlambat lebih dari 40 menit.
              </p>
            </div>

            {/* Questions */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 mb-6">
              <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider mb-2 flex items-center gap-1.5">
                ❓ INSTRUKSI ANALISIS SOAL KASUS 1:
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-blue-950 leading-relaxed">
                <li>
                  <strong>Model Bisnis Digital apa yang paling tepat</strong> diterapkan untuk menyelesaikan kendala kapasitas fisik warung tersebut tanpa harus menyewa ruko baru? (Pilihlah di antara B2C murni, O2O / Pre-Order pickup, atau model lainnya) Uraikan alasan logis Anda!
                </li>
                <li>
                  Rancanglah <strong>minimal 2 pola monetisasi (Revenue Streams / Sumber Pendapatan) baru</strong> yang bisa diciptakan melalui platform digital tersebut selain dari penjualan ayam geprek per porsi di meja makan!
                </li>
              </ol>
            </div>

            {/* Answer Form */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Lembar Jawaban Kasus 1 (Hasil Diskusi Kelompok) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={9}
                value={jawabanK1}
                onChange={(e) => setJawabanK1(e.target.value)}
                placeholder="Tuliskan jawaban analisis kelompok Anda secara terstruktur dan terperinci..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm leading-relaxed"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Diskusikan bersama kelompok dan jawab kedua pertanyaan di atas.</span>
                <span>{jawabanK1.length} karakter</span>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-amber-700 font-medium">
                ⏱️ Waktu otomatis berpindah jika 10 menit habis.
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!jawabanK1.trim() && !confirm("Jawaban Kasus 1 masih kosong. Yakin ingin lanjut ke Kasus 2?")) return;
                  setStep(3);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center gap-2"
              >
                <span>Simpan & Lanjut ke Kasus 2</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: STUDI KASUS 2 */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 transition-all">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Wheat className="w-3.5 h-3.5" /> Kasus 2 dari 2 • Alokasi 10 Menit
              </span>
              <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {kelas} • {kelompok}
              </span>
            </div>

            {/* Timer Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
              <div
                className={`h-full transition-all duration-1000 ${
                  timerSeconds <= 60
                    ? "bg-red-500"
                    : timerSeconds <= 180
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                }`}
                style={{ width: `${(timerSeconds / DURATION_SECONDS) * 100}%` }}
              />
            </div>

            {/* Narrative */}
            <div className="bg-slate-50 border-l-4 border-emerald-600 border-y border-r border-slate-200 rounded-xl p-5 mb-6 text-sm text-slate-700 leading-relaxed">
              <div className="text-[11px] font-black uppercase text-emerald-700 tracking-wider mb-1">
                Sektor Hasil Perkebunan & Pertanian Rakyat Asahan
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">
                Salak Madu Buntu Pane & Kisaran (Komoditas Unggulan)
              </h3>
              <p className="mb-2">
                Kecamatan Buntu Pane dan sekitarnya di Kabupaten Asahan terkenal menghasilkan salak berkualitas manis dan renyah. Setiap musim panen raya, produksi buah salak melimpah ruah mencapai puluhan ton per minggu. Namun, para petani mengeluh karena harga jual salak anjlok drastis di tingkat tengkulak menjadi hanya Rp 3.500 per kg, sementara di kota besar seperti Medan atau Pekanbaru harganya bisa mencapai Rp 15.000 s/d Rp 20.000 per kg.
              </p>
              <p>
                Salak memiliki masa simpan segar yang singkat (7–10 hari sebelum kulit menghitam dan rasa berubah masam). Petani lokal ingin berinisiatif membangun inisiatif e-bisnis mandiri yang didukung oleh pemerintah daerah dan komunitas mahasiswa, tetapi mereka bingung harus memulai dari mana dan bagaimana merumuskan ruang lingkup bisnis digitalnya.
              </p>
            </div>

            {/* Questions */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 mb-6">
              <h4 className="text-xs font-black uppercase text-emerald-900 tracking-wider mb-2">
                ❓ INSTRUKSI ANALISIS SOAL KASUS 2 (KERANGKA 4W & VALUE PROPOSITION):
              </h4>
              <p className="text-xs text-emerald-950 mb-2">
                Terapkan <strong>Kerangka Prinsip 4W (What, Who, Where, Why)</strong> secara terperinci:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-emerald-950 leading-relaxed">
                <li><strong>WHAT:</strong> Produk atau inovasi nilai apa saja yang harus ditawarkan agar tidak terancam risiko buah cepat busuk dalam perjalanan?</li>
                <li><strong>WHO:</strong> Petakan siapa saja pihak/aktor dalam ekosistem rantai pasok lokal yang harus dilibatkan!</li>
                <li><strong>WHERE:</strong> Melalui kanal digital apa saja transaksi dan distribusi ini paling efektif dijalankan?</li>
                <li><strong>WHY (Value Proposition):</strong> Mengapa konsumen luar kota tertarik membeli melalui platform ini dibandingkan membeli buah di pasar tradisional terdekat mereka?</li>
              </ol>
            </div>

            {/* Answer Form */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Lembar Jawaban Kasus 2 (Hasil Diskusi Kelompok) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={10}
                value={jawabanK2}
                onChange={(e) => setJawabanK2(e.target.value)}
                placeholder="Uraikan jawaban Kerangka 4W (What, Who, Where, Why) kelompok Anda di sini..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm leading-relaxed"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Pastikan seluruh poin 4W dijawab dengan solusi aplikatif untuk wilayah Asahan.</span>
                <span>{jawabanK2.length} karakter</span>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-red-600 font-medium">
                ⚠️ Setelah submit, formulir akan TERKUNCI secara permanen.
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin menyelesaikan diskusi dan mengunci lembar jawaban?")) {
                    handleFinalSubmit();
                  }
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center gap-2"
              >
                <span>Selesaikan & Kunci Jawaban</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW / HASIL TERKUNCI */}
        {step === 4 && lockedSubmission && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 transition-all">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
              <Lock className="w-3.5 h-3.5" /> STATUS: SELESAI & TERKUNCI
            </span>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Lembar Jawaban Diskusi Kelompok E-Bisnis
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Jawaban kelompok Anda telah tersimpan secara resmi pada database. Formulir terkunci untuk menjaga keaslian waktu pengumpulan.
            </p>

            {/* Metadata Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Kelas E-Bisnis</span>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">{lockedSubmission.kelas}</div>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Kelompok</span>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">{lockedSubmission.kelompok}</div>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Waktu Pengiriman</span>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">{lockedSubmission.submittedAt}</div>
              </div>
              <div className="sm:col-span-3 pt-2 border-t border-slate-200">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Anggota Kelompok</span>
                <div className="font-semibold text-slate-800 mt-1 whitespace-pre-wrap">{lockedSubmission.anggota}</div>
              </div>
            </div>

            {/* Answer 1 */}
            <div className="mb-6">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Jawaban Kasus 1: Warung Ayam Geprek 'Crispy Asahan'
              </h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {lockedSubmission.jawabanKasus1}
              </div>
            </div>

            {/* Answer 2 */}
            <div className="mb-8">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-2">
                <Wheat className="w-4 h-4 text-emerald-600" />
                Jawaban Kasus 2: Salak Madu Buntu Pane & Kisaran (Prinsip 4W)
              </h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {lockedSubmission.jawabanKasus2}
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Cetak / Unduh PDF
              </button>
              <button
                type="button"
                onClick={copyToClipboard}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Salin Teks Jawaban
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 bg-transparent border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
              >
                Halaman Utama
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Admin Drawer */}
        <div className="mt-12 pt-6 border-t border-dashed border-slate-300 text-center">
          <button
            type="button"
            onClick={() => {
              setIsAdminOpen(!isAdminOpen);
              if (!isAdminOpen) fetchAdminList();
            }}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition inline-flex items-center gap-1.5"
          >
            <span>⚙️ Panel Pengajar / Rekap Data Database</span>
          </button>

          {isAdminOpen && (
            <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5 text-left shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h4 className="text-xs font-black uppercase text-slate-800">
                  Data Jawaban Masuk (Database SQLite)
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchAdminList}
                    disabled={isLoadingAdmin}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingAdmin ? "animate-spin" : ""}`} /> Refresh
                  </button>
                  <button
                    onClick={exportCSV}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Unduh CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left">
                      <th className="p-2">No</th>
                      <th className="p-2">Kelas</th>
                      <th className="p-2">Kelompok</th>
                      <th className="p-2">Waktu</th>
                      <th className="p-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          Belum ada kelompok yang mengumpulkan data.
                        </td>
                      </tr>
                    ) : (
                      adminList.map((item, idx) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 font-bold">{item.kelas}</td>
                          <td className="p-2 font-bold">{item.kelompok}</td>
                          <td className="p-2 text-slate-500">{item.submittedAt}</td>
                          <td className="p-2">
                            <button
                              onClick={() => {
                                setLockedSubmission(item);
                                setStep(4);
                              }}
                              className="text-blue-600 hover:underline font-bold mr-2"
                            >
                              Lihat
                            </button>
                            <button
                              onClick={() => handleResetGroup(item.kelas, item.kelompok)}
                              className="text-red-500 hover:underline font-bold"
                            >
                              Reset
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
