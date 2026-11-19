import { createClient, Client } from "@libsql/client";
import { Submission } from "@/types";

// In-memory fallback for initial Vercel deploy before configuring Turso
const memoryStore = new Map<string, Submission>();

let client: Client | null = null;

function getClient(): Client | null {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL || (process.env.NODE_ENV === "development" ? "file:ebisnis.db" : "");
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    try {
      client = createClient({
        url,
        authToken,
      });
      return client;
    } catch (e) {
      console.error("Failed to initialize libSQL client:", e);
      return null;
    }
  }

  return null;
}

export async function initDb(): Promise<void> {
  const db = getClient();
  if (!db) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      kelas TEXT NOT NULL,
      kelompok TEXT NOT NULL,
      anggota TEXT NOT NULL,
      jawaban_kasus1 TEXT,
      jawaban_kasus2 TEXT,
      submitted_at TEXT NOT NULL,
      status TEXT NOT NULL,
      UNIQUE(kelas, kelompok)
    )
  `);
}

export async function getSubmission(kelas: string, kelompok: string): Promise<Submission | null> {
  const db = getClient();

  if (!db) {
    const key = `${kelas}___${kelompok}`;
    return memoryStore.get(key) || null;
  }

  await initDb();
  const rs = await db.execute({
    sql: "SELECT * FROM submissions WHERE kelas = ? AND kelompok = ?",
    args: [kelas, kelompok],
  });

  if (rs.rows.length === 0) return null;

  const row = rs.rows[0];
  return {
    id: String(row.id),
    kelas: String(row.kelas),
    kelompok: String(row.kelompok),
    anggota: String(row.anggota),
    jawabanKasus1: String(row.jawaban_kasus1 || ""),
    jawabanKasus2: String(row.jawaban_kasus2 || ""),
    submittedAt: String(row.submitted_at),
    status: String(row.status),
  };
}

export async function getAllSubmissions(): Promise<Submission[]> {
  const db = getClient();

  if (!db) {
    return Array.from(memoryStore.values());
  }

  await initDb();
  const rs = await db.execute("SELECT * FROM submissions ORDER BY submitted_at DESC");

  return rs.rows.map((row) => ({
    id: String(row.id),
    kelas: String(row.kelas),
    kelompok: String(row.kelompok),
    anggota: String(row.anggota),
    jawabanKasus1: String(row.jawaban_kasus1 || ""),
    jawabanKasus2: String(row.jawaban_kasus2 || ""),
    submittedAt: String(row.submitted_at),
    status: String(row.status),
  }));
}

export async function saveSubmission(sub: Submission): Promise<boolean> {
  const db = getClient();

  if (!db) {
    const key = `${sub.kelas}___${sub.kelompok}`;
    memoryStore.set(key, sub);
    return true;
  }

  await initDb();
  await db.execute({
    sql: `INSERT INTO submissions (id, kelas, kelompok, anggota, jawaban_kasus1, jawaban_kasus2, submitted_at, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      sub.id,
      sub.kelas,
      sub.kelompok,
      sub.anggota,
      sub.jawabanKasus1,
      sub.jawabanKasus2,
      sub.submittedAt,
      sub.status,
    ],
  });

  return true;
}

export async function deleteSubmission(kelas: string, kelompok: string): Promise<boolean> {
  const db = getClient();

  if (!db) {
    const key = `${kelas}___${kelompok}`;
    return memoryStore.delete(key);
  }

  await initDb();
  await db.execute({
    sql: "DELETE FROM submissions WHERE kelas = ? AND kelompok = ?",
    args: [kelas, kelompok],
  });

  return true;
}
