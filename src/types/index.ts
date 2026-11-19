export interface Submission {
  id: string;
  kelas: string;
  kelompok: string;
  anggota: string;
  jawabanKasus1: string;
  jawabanKasus2: string;
  submittedAt: string;
  status: string;
}

export interface CheckResponse {
  exists: boolean;
  submission?: Submission;
}
