import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🛡️ AI Forsikringsguiden
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Intelligent forsikringsrådgivning med AI-drevet analyse
          </p>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Velkommen til Danmarks mest avancerede AI-forsikringssystem!
            </h2>
            <p className="text-gray-600 mb-6">
              Få personlig rådgivning, sammenlign forsikringer og optimer din dækning med vores AI-agenter.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/chat" className="group">
              <div className="bg-blue-50 rounded-lg p-6 hover:bg-blue-100 transition-colors">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Chat</h3>
                <p className="text-sm text-gray-600">
                  Stil spørgsmål til vores forsikringsekspert AI
                </p>
              </div>
            </Link>

            <Link href="/dashboard" className="group">
              <div className="bg-green-50 rounded-lg p-6 hover:bg-green-100 transition-colors">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-gray-900 mb-2">Dashboard</h3>
                <p className="text-sm text-gray-600">
                  Oversigt over dine forsikringer og anbefaling
                </p>
              </div>
            </Link>

            <Link href="/policies" className="group">
              <div className="bg-purple-50 rounded-lg p-6 hover:bg-purple-100 transition-colors">
                <div className="text-3xl mb-3">📄</div>
                <h3 className="font-semibold text-gray-900 mb-2">Policer</h3>
                <p className="text-sm text-gray-600">
                  Administrer og analyser dine forsikringer
                </p>
              </div>
            </Link>

            <Link href="/documents" className="group">
              <div className="bg-orange-50 rounded-lg p-6 hover:bg-orange-100 transition-colors">
                <div className="text-3xl mb-3">📁</div>
                <h3 className="font-semibold text-gray-900 mb-2">Dokumenter</h3>
                <p className="text-sm text-gray-600">
                  Upload og analyser forsikringsdokumenter
                </p>
              </div>
            </Link>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Link 
              href="/chat" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              🚀 Start AI Rådgivning Nu
            </Link>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Vælg Din Plan</h2>
            <p className="text-gray-600">Start gratis og upgrade når du har brug for mere</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="border border-gray-200 rounded-lg p-6 text-center">
              <div className="text-3xl mb-4">🆓</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Gratis</h3>
              <div className="text-2xl font-bold text-gray-900 mb-4">0 kr</div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li>✅ Basis AI chat</li>
                <li>✅ Op til 3 dokumenter</li>
                <li>✅ Grundlæggende analyse</li>
                <li>❌ PDF eksport</li>
                <li>❌ Chat historik</li>
                <li>❌ Avanceret analyse</li>
              </ul>
              <Link 
                href="/chat"
                className="block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Start Gratis
              </Link>
            </div>

            {/* Per Report */}
            <div className="border border-blue-200 rounded-lg p-6 text-center bg-blue-50">
              <div className="text-3xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Per Rapport</h3>
              <div className="text-2xl font-bold text-blue-600 mb-4">39 kr</div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li>✅ Alt fra Gratis</li>
                <li>✅ PDF eksport af rapport</li>
                <li>✅ Detaljeret sammenligning</li>
                <li>✅ Professionel layout</li>
                <li>❌ Ubegrænset dokumenter</li>
                <li>❌ Chat historik</li>
              </ul>
              <Link 
                href="/documents"
                className="block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Upload & Analysér
              </Link>
            </div>

            {/* Premium */}
            <div className="border-2 border-green-500 rounded-lg p-6 text-center bg-green-50 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Mest Populær
                </span>
              </div>
              <div className="text-3xl mb-4">👑</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Premium</h3>
              <div className="text-2xl font-bold text-green-600 mb-4">149 kr/md</div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li>✅ Alt fra Per Rapport</li>
                <li>✅ Ubegrænset dokumenter</li>
                <li>✅ Avanceret AI analyse</li>
                <li>✅ Chat historik</li>
                <li>✅ Premium support</li>
                <li>✅ Tidlig adgang til nye features</li>
              </ul>
              <Link 
                href="/upgrade"
                className="block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Upgrade Nu
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-blue-600 mb-2">3</div>
            <div className="text-gray-600">Gratis Dokumenter</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-green-600 mb-2">39kr</div>
            <div className="text-gray-600">Per PDF Eksport</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-purple-600 mb-2">149kr</div>
            <div className="text-gray-600">Premium Månedligt</div>
          </div>
        </div>

      </div>
    </div>
  )
}