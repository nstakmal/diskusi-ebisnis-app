# Aplikasi Latihan Diskusi Kelompok E-Bisnis (Next.js TypeScript + SQLite)

Aplikasi web interaktif untuk latihan studi kasus kelompok mata kuliah **E-Bisnis** (Program Studi Sistem Informasi, Universitas Royal Kisaran), dirancang khusus untuk siap dideploy ke **Vercel** dengan database **SQLite**.

---

## 🎯 Fitur Utama

1. **Identitas & Anti Pengisian Ganda (Locking Otomatis):**
   - Dropdown Kelas: `Ebisnis 4`, `Ebisnis 5`, `Ebisnis 6`.
   - Dropdown Kelompok: `Kelompok 1` s/d `Kelompok 6`.
   - Input Anggota Kelompok (Nama & NIM).
   - **Pemeriksaan Realtime:** Ketika Kelas dan Kelompok dipilih, sistem langsung mengecek database. Jika sudah pernah submit, formulir otomatis **TERKUNCI** dan mahasiswa hanya bisa melihat hasil rekap lembar jawabannya.
2. **2 Soal Kasus Nyata (Masing-Masing 10 Menit):**
   - **Kasus 1:** Warung Ayam Geprek 'Crispy Asahan' (Jalan Cokroaminoto) — *Model Bisnis Digital & Pola Monetisasi/Revenue Streams*.
   - **Kasus 2:** Salak Madu Buntu Pane & Kisaran — *Kerangka 4W (What, Who, Where, Why) & Value Proposition*.
3. **Timer Otomatis & Autosave:**
   - Countdown timer 10:00 menit per kasus dilengkapi visual progress bar dan sinyal audio bip pada menit 2:00 dan detik 0:30.
   - Jika waktu habis, sistem otomatis berpindah ke Kasus 2 dan otomatis mengirim/mengunci jawaban.
4. **Halaman Hasil & Review:**
   - Rekap jawaban resmi terkunci, tombol Cetak PDF, dan tombol Salin ke Clipboard.
5. **Panel Pengajar / Admin:**
   - Tabel rekap jawaban semua kelompok secara realtime.
   - Fitur Unduh CSV / Excel.
   - Tombol Reset jika ada kelompok yang ingin remedial.

---

## 🚀 Cara Menjalankan di Komputer Lokal

1. Masuk ke folder proyek:
   ```bash
   cd "Latihan dan Ujian/diskusi-ebisnis-app"
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan server lokal:
   ```bash
   npm run dev
   ```
4. Buka di browser: `http://localhost:3000`.
   *(Secara otomatis database SQLite lokal akan dibuat di file `ebisnis.db`).*

---

## ☁️ Panduan Upload & Deploy ke Vercel (Gratis)

Karena Vercel adalah platform *Serverless* (sistem file read-only), database SQLite standar tidak bisa menulis ke harddisk serverless secara persisten. Solusi resmi dan paling populer adalah menggunakan **Turso** (SQLite Serverless over HTTP yang 100% gratis).

### Langkah 1: Buat Database SQLite Gratis di Turso
1. Buka [https://turso.tech](https://turso.tech) dan login dengan akun GitHub Anda.
2. Buat database baru (misal diberi nama: `ebisnis-db`).
3. Dapatkan 2 informasi penting:
   - **Database URL:** Contoh `libsql://ebisnis-db-username.turso.io`
   - **Auth Token:** Buat token baru di menu Settings / Tokens.

### Langkah 2: Upload Proyek ke GitHub
1. Buat repositori baru di GitHub Anda (misal: `diskusi-ebisnis`).
2. Masukkan folder `diskusi-ebisnis-app` ke repo tersebut dan push ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit aplikasi diskusi ebisnis"
   git branch -M main
   git remote add origin https://github.com/USERNAME-ANDA/diskusi-ebisnis.git
   git push -u origin main
   ```

### Langkah 3: Deploy di Vercel
1. Buka dashboard [https://vercel.com](https://vercel.com) dan login dengan GitHub.
2. Klik tombol **"Add New..."** > **"Project"**.
3. Pilih repositori `diskusi-ebisnis` yang baru saja Anda push.
4. Pada bagian **Environment Variables**, tambahkan 2 variabel berikut:
   - `TURSO_DATABASE_URL` : nilai URL dari Turso (misal `libsql://ebisnis-db-username.turso.io`)
   - `TURSO_AUTH_TOKEN` : nilai token rahasia dari Turso
5. Klik **"Deploy"**.
6. Selesai! Dalam 1 menit aplikasi Anda sudah online dengan URL resmi dari Vercel (misal: `https://diskusi-ebisnis.vercel.app`).

### Langkah 4: Menampilkan di Blog Anda
Untuk memasukkan aplikasi ini ke dalam postingan Blog (Blogger / WordPress / Web Kampus):
```html
<iframe 
  src="https://diskusi-ebisnis.vercel.app" 
  width="100%" 
  height="920px" 
  frameborder="0" 
  style="border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
</iframe>
```
