'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Document {
  id: string
  filename: string
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState({
    totalDocuments: 0,
    lastUpload: null as string | null
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/documents/compare')
      const result = await response.json()
      
      if (result.success) {
        setDocuments(result.documents)
        setStats({
          totalDocuments: result.documents.length,
          lastUpload: result.documents.length > 0 ? result.documents[0].filename : null
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📊 Dashboard</h1>
        <p className="text-gray-600">Oversigt over dine forsikringsdokumenter og aktivitet</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl text-blue-600 mr-3">📄</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
              <p className="text-sm text-gray-600">Uploadede Dokumenter</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl text-green-600 mr-3">💬</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">AI</p>
              <p className="text-sm text-gray-600">Forsikringsrådgiver</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl text-purple-600 mr-3">⚖️</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">24/7</p>
              <p className="text-sm text-gray-600">Sammenligning</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl text-orange-600 mr-3">🔍</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">GDPR</p>
              <p className="text-sm text-gray-600">Sikker Analyse</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Hurtige Handlinger</h2>
          <div className="space-y-4">
            <Link 
              href="/documents"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <div className="text-2xl mr-4">📁</div>
                <div>
                  <h3 className="font-medium text-gray-900">Upload Nyt Dokument</h3>
                  <p className="text-sm text-gray-600">Upload og analyser forsikringspolicer</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/chat"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <div className="text-2xl mr-4">💬</div>
                <div>
                  <h3 className="font-medium text-gray-900">Chat med AI</h3>
                  <p className="text-sm text-gray-600">Stil spørgsmål om forsikring</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/policies"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <div className="text-2xl mr-4">⚖️</div>
                <div>
                  <h3 className="font-medium text-gray-900">Sammenlign Policer</h3>
                  <p className="text-sm text-gray-600">Find den bedste forsikring</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Dine Dokumenter</h2>
          
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📂</div>
              <p className="text-gray-600 mb-4">Ingen dokumenter uploadet endnu</p>
              <Link 
                href="/documents"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📄 Upload Dit Første Dokument
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
                  <div className="text-lg mr-3">📄</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-sm text-gray-500">ID: {doc.id}</p>
                  </div>
                </div>
              ))}
              
              {documents.length > 5 && (
                <div className="text-center pt-4">
                  <Link 
                    href="/documents"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Se alle {documents.length} dokumenter →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Features Overview */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Funktioner</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-medium text-gray-900 mb-1">AI Analyse</h3>
            <p className="text-sm text-gray-600">Intelligent læsning af forsikringsdokumenter</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-medium text-gray-900 mb-1">Chat Support</h3>
            <p className="text-sm text-gray-600">Stil spørgsmål og få svar på dansk</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-medium text-gray-900 mb-1">Sammenligning</h3>
            <p className="text-sm text-gray-600">Sammenlign flere forsikringer side om side</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-medium text-gray-900 mb-1">Sikkerhed</h3>
            <p className="text-sm text-gray-600">GDPR compliant og sikker databehandling</p>
          </div>
        </div>
      </div>
    </div>
  )
}