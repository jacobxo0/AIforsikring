import type { Metadata } from "next";
import Link from 'next/link';
import "./globals.css";
import { Inter } from 'next/font/google';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "AI Forsikringsguiden | Intelligent dansk forsikringsrådgivning",
  description: "Få ekspert forsikringsrådgivning med AI. Upload dokumenter, stil spørgsmål, og få personlig hjælp til forsikringsspørgsmål på dansk.",
  keywords: "forsikring, AI, rådgivning, danmark, bilforsikring, husejerforsikring, indboforsikring",
  authors: [{ name: "AI Forsikringsguiden Team" }],
  robots: "index, follow",
  openGraph: {
    title: "AI Forsikringsguiden",
    description: "Intelligent dansk forsikringsrådgivning med AI",
    type: "website",
    locale: "da_DK",
    siteName: "AI Forsikringsguiden"
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body className={`${inter.className} antialiased bg-gray-50 min-h-screen`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* Global Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">AI</span>
                      </div>
                      <h1 className="text-xl font-bold text-gray-900">
                        Forsikringsguiden
                      </h1>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="hidden md:flex space-x-8">
                    <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Hjem
                    </Link>
                    <Link href="/chat" className="text-gray-600 hover:text-blue-600 transition-colors">
                      AI Chat
                    </Link>
                    <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Dashboard
                    </Link>
                    <Link href="/policies" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Policer
                    </Link>
                    <Link href="/documents" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Dokumenter
                    </Link>
                  </nav>

                  {/* Mobile menu button */}
                  <div className="md:hidden">
                    <button className="text-gray-600 hover:text-blue-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  
                  {/* Company info */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">AI</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900">Forsikringsguiden</span>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Danmarks mest avancerede AI-drevne forsikringsrådgivning. Få personlig vejledning, sammenlign priser og optimer din forsikringsdækning.
                    </p>
                    <div className="text-sm text-gray-500">
                      © 2025 AI Forsikringsguiden. Alle rettigheder forbeholdes.
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Tjenester</h3>
                    <ul className="space-y-2 text-sm">
                      <li><Link href="/chat" className="text-gray-600 hover:text-blue-600">AI Chat</Link></li>
                      <li><Link href="/documents" className="text-gray-600 hover:text-blue-600">Dokumentanalyse</Link></li>
                      <li><Link href="/policies" className="text-gray-600 hover:text-blue-600">Policy sammenligning</Link></li>
                      <li><Link href="/claims" className="text-gray-600 hover:text-blue-600">Skadehåndtering</Link></li>
                    </ul>
                  </div>

                  {/* Support */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
                    <ul className="space-y-2 text-sm">
                      <li><Link href="/help" className="text-gray-600 hover:text-blue-600">Hjælp & FAQ</Link></li>
                      <li><Link href="/contact" className="text-gray-600 hover:text-blue-600">Kontakt os</Link></li>
                      <li><Link href="/privacy" className="text-gray-600 hover:text-blue-600">Privatlivspolitik</Link></li>
                      <li><Link href="/terms" className="text-gray-600 hover:text-blue-600">Servicevilkår</Link></li>
                    </ul>
                  </div>

                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}