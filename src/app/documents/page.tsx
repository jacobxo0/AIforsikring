'use client'

import { useState } from 'react'
import PDFUpload from '@/components/PDFUpload'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<{ name: string; content: string; type: string; size?: string }[]>([])

  const handleDocumentParsed = (document: { name: string; content: string; type: string }) => {
    setDocuments(prev => [...prev, document])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            📄 Mine Dokumenter
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                📤 Upload Dokumenter
              </h2>
              <PDFUpload onDocumentParsed={handleDocumentParsed} />
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                📚 Dine Dokumenter ({documents.length})
              </h2>
              
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📁</div>
                  <p className="text-gray-500">
                    Ingen dokumenter uploadet endnu.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Upload dine forsikringsdokumenter for at få bedre rådgivning.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <p className="text-sm text-gray-500">{doc.size}</p>
                        </div>
                      </div>
                      <button className="text-red-600 hover:text-red-800">
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 