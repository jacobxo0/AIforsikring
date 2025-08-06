import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "AI Forsikringsguiden | Intelligent dansk forsikringsrådgivning",
  description: "Få ekspert forsikringsrådgivning med AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body className={`${inter.className} antialiased bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}