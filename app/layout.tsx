import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next.js Clean App',
  description: 'A clean Next.js 13+ application with App Router',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">
                    Next.js App
                  </h1>
                </div>
                <nav className="hidden md:flex space-x-8">
                  <a href="#" className="text-gray-500 hover:text-gray-900">
                    Home
                  </a>
                  <a href="#" className="text-gray-500 hover:text-gray-900">
                    About
                  </a>
                  <a href="#" className="text-gray-500 hover:text-gray-900">
                    Contact
                  </a>
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-gray-50 border-t">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <p className="text-gray-500">
                  © 2024 Next.js Clean App. Built with Next.js 13+ App Router.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}