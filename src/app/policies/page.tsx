'use client'

import React, { useState, useEffect } from 'react'

interface Document {
  id: string
  filename: string
  analysis?: {
    fullText?: string
  }
  fullText?: string
}

export default function PoliciesPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [comparison, setComparison] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      // Documents are managed on /documents in-memory; here we just rely on user navigation
      const response = await fetch('/api/documents/compare')
      const result = await response.json()
      if (result.success) {
        setDocuments(result.documents || [])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocs(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId])
  }

  const compareDocuments = async () => {
    if (selectedDocs.length < 2) {
      setError('Vælg mindst 2 dokumenter for sammenligning')
      return
    }

    setIsLoading(true)
    setError(null)
    setComparison(null)

    try {
      // Build payload with fullText from the selected documents if present in local state
      const documentsPayload = selectedDocs.map(id => {
        const d = documents.find(x => x.id === id)
        return { id, fullText: d?.fullText || d?.analysis?.fullText || '' }
      })

      const response = await fetch('/api/documents/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentsPayload })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Sammenligning fejlede')

      if (result.success) setComparison(result.comparison)
    } catch (error) {
      console.error('Comparison error:', error)
      setError(error instanceof Error ? error.message : 'Sammenligning fejlede')
    } finally {
      setIsLoading(false)
    }
  }

  const clearComparison = () => {
    setComparison(null)
    setSelectedDocs([])
    setError(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📄 Forsikringssammenligning</h1>
        <p className="text-gray-600">Sammenlign dine forsikringspolicer og find den bedste dækning</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Document Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Vælg Policer ({selectedDocs.length})</h2>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📂</div>
                <p className="text-gray-600">Ingen dokumenter fundet</p>
                <p className="text-sm text-gray-500 mt-2">Upload dokumenter på /documents siden først</p>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDocs.includes(doc.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleDocumentSelection(doc.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="mr-3 h-4 w-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {doc.filename || doc.id}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {doc.id}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={compareDocuments}
                disabled={selectedDocs.length < 2 || isLoading}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  selectedDocs.length >= 2 && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? 'Sammenligner...' : '🔍 Sammenlign Policer'}
              </button>
              {selectedDocs.length > 0 && (
                <button
                  onClick={clearComparison}
                  className="w-full py-2 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Ryd Valg
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tips:</strong> Vælg 2-3 forsikringspolicer for den bedste sammenligning
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Results */}
        <div className="lg:col-span-2">
          {comparison ? (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Sammenligning af {selectedDocs.length} policer</h2>
                <button onClick={clearComparison} className="text-gray-500 hover:text-gray-700" title="Luk sammenligning">✕</button>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{comparison}</div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-6xl mb-4">⚖️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {documents.length === 0 ? 'Upload dokumenter først' : selectedDocs.length === 0 ? 'Vælg policer til sammenligning' : selectedDocs.length === 1 ? 'Vælg mindst én police mere' : 'Klik "Sammenlign Policer" for at starte'}
              </h2>
              <p className="text-gray-600">
                {documents.length === 0 ? 'Gå til Dokumenter siden og upload dine forsikringspolicer' : selectedDocs.length < 2 ? 'Vælg mindst 2 policer fra listen til venstre for at sammenligne dem' : 'AI vil analysere dine policer og give dig en detaljeret sammenligning'}
              </p>
              {documents.length === 0 && (
                <div className="mt-6">
                  <a href="/documents" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">📄 Gå til Dokumenter</a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}