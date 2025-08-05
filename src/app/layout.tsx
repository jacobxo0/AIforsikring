import type { Metadata } from "next";
import Link from 'next/link';
import "./globals.css";
import { Inter } from 'next/font/google';
import { HierarchicalErrorBoundary } from '@/components/error/ErrorBoundaryHierarchy';
import LoadingBoundary from '@/components/LoadingBoundary';
// import LiveErrorMonitor from '@/components/debug/LiveErrorMonitor'; // Temporarily disabled

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
          <div className="min-h-screen flex flex-col">
            {/* Global Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-insurance-blue rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">AI</span>
                      </div>
                      <h1 className="text-xl font-bold text-gray-900">
                        Forsikringsguiden
                      </h1>
                    </div>
                  </div>

                  <nav className="hidden md:flex items-center space-x-6">
                    <Link href="/" className="text-gray-600 hover:text-insurance-blue transition-colors">
                      Hjem
                    </Link>
                    <Link href="/chat" className="text-gray-600 hover:text-insurance-blue transition-colors">
                      Chat
                    </Link>
                    <Link href="/dashboard" className="text-gray-600 hover:text-insurance-blue transition-colors">
                      Dashboard
                    </Link>
                    <Link href="/policies" className="text-gray-600 hover:text-insurance-blue transition-colors">
                      Forsikringer
                    </Link>
                    <Link href="/documents" className="text-gray-600 hover:text-insurance-blue transition-colors">
                      Dokumenter
                    </Link>
                  </nav>

                  <div className="flex items-center space-x-4">
                    <button
                      className="text-gray-600 hover:text-insurance-blue"
                      title="Brugerindstillinger"
                      aria-label="Åbn brugerindstillinger"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5 5-5m-5 5H9" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
              <HierarchicalErrorBoundary appName="AI Forsikringsguiden">
                <LoadingBoundary>
                  {children}
                </LoadingBoundary>
              </HierarchicalErrorBoundary>
            </main>

            {/* Global Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      AI Forsikringsguiden
                    </h3>
                    <p className="text-sm text-gray-600">
                      Intelligent forsikringsrådgivning på dansk med respekt for dit privatliv.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Tjenester
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li><a href="/chat" className="hover:text-insurance-blue">AI Chat</a></li>
                      <li><a href="/documents" className="hover:text-insurance-blue">Dokumentanalyse</a></li>
                      <li><a href="/comparison" className="hover:text-insurance-blue">Prissammenligning</a></li>
                      <li><a href="/claims" className="hover:text-insurance-blue">Skadehåndtering</a></li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Support
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li><a href="/help" className="hover:text-insurance-blue">Hjælp & FAQ</a></li>
                      <li><a href="/contact" className="hover:text-insurance-blue">Kontakt os</a></li>
                      <li><a href="/feedback" className="hover:text-insurance-blue">Send feedback</a></li>
                      <li><a href="/status" className="hover:text-insurance-blue">Service status</a></li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Juridisk
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li><a href="/privacy" className="hover:text-insurance-blue">Privatlivspolitik</a></li>
                      <li><a href="/terms" className="hover:text-insurance-blue">Servicevilkår</a></li>
                      <li><a href="/gdpr" className="hover:text-insurance-blue">GDPR</a></li>
                      <li><a href="/cookies" className="hover:text-insurance-blue">Cookie politik</a></li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex flex-col md:flex-row items-center justify-between">
                    <p className="text-sm text-gray-600">
                      © 2024 AI Forsikringsguiden. Alle rettigheder forbeholdes.
                    </p>
                    <div className="flex items-center space-x-4 mt-4 md:mt-0">
                      <span className="text-xs text-gray-500">Bygget med ❤️ i Danmark</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-gray-500">Alle systemer kører</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
                      </div>
      
      {/* Live Debug Monitor - Temporarily disabled */}
      {/* <LiveErrorMonitor /> */}
      </body>
    </html>
  );
}