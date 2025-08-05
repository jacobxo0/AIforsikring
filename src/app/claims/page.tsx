'use client'

import { useState } from 'react'

interface Claim {
  id: string
  title: string
  description: string
  status: 'open' | 'processing' | 'closed'
  createdAt: Date
  amount?: number
}

export default function ClaimsPage() {
  const [claims] = useState<Claim[]>([])
  const [showNewClaimForm, setShowNewClaimForm] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'closed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Åben'
      case 'processing': return 'Behandles'
      case 'closed': return 'Lukket'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🛡️ Mine Skadessager
            </h1>
            <button
              onClick={() => setShowNewClaimForm(true)}
              className="bg-insurance-blue text-white px-6 py-2 rounded-lg hover:bg-insurance-dark transition-colors"
            >
              ➕ Anmeld Skade
            </button>
          </div>

          {claims.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-gray-400 text-6xl mb-6">🛡️</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Ingen skadessager endnu
              </h2>
              <p className="text-gray-600 mb-6">
                Du har ingen aktive eller tidligere skadessager.
              </p>
              <button
                onClick={() => setShowNewClaimForm(true)}
                className="bg-insurance-blue text-white px-8 py-3 rounded-lg hover:bg-insurance-dark transition-colors"
              >
                🚨 Anmeld din første skade
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {claims.map((claim) => (
                <div key={claim.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {claim.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                      {getStatusText(claim.status)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {claim.description}
                  </p>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>
                      📅 {claim.createdAt.toLocaleDateString('da-DK')}
                    </span>
                    {claim.amount && (
                      <span className="font-medium">
                        💰 {claim.amount.toLocaleString('da-DK')} kr.
                      </span>
                    )}
                  </div>
                  
                  <button className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    👁️ Se detaljer
                  </button>
                </div>
              ))}
            </div>
          )}

          {showNewClaimForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  🚨 Anmeld Skade
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titel
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-insurance-blue focus:border-transparent"
                      placeholder="Kort beskrivelse af skaden"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Beskrivelse
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-insurance-blue focus:border-transparent"
                      rows={4}
                      placeholder="Beskriv hvad der skete..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimeret beløb (valgfrit)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-insurance-blue focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewClaimForm(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={() => setShowNewClaimForm(false)}
                    className="flex-1 bg-insurance-blue text-white py-2 rounded-lg hover:bg-insurance-dark transition-colors"
                  >
                    📤 Indsend
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 