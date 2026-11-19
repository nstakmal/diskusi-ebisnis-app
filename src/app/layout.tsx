import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Latihan Diskusi Kelompok E-Bisnis — Universitas Royal Kisaran",
  description: "Aplikasi diskusi studi kasus E-Bisnis dengan timer otomatis dan anti duplikasi submit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${plusJakarta.className} bg-slate-100 min-h-screen text-slate-800 flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
