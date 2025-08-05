'use client'

import { useState } from 'react'

interface Document {
  name: string
  content: string
  type: string
  uploadDate?: Date
}

interface DocumentViewerProps {
  documents: Document[]
  onDocumentSelect?: (document: Document) => void
  highlightTerms?: string[]
}

export default function DocumentViewer({ 
  documents, 
  onDocumentSelect,
  highlightTerms = []
}: DocumentViewerProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    documents.length > 0 ? documents[0] : null
  )
  const [searchTerm, setSearchTerm] = useState('')

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document)
    onDocumentSelect?.(document)
  }

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'insurance_policy':
        return '📋'
      case 'claim_document':
        return '🔧'
      case 'correspondence':
        return '✉️'
      default:
        return '📄'
    }
  }

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'insurance_policy':
        return 'Forsikringspolice'
      case 'claim_document':
        return 'Skadeanmeldelse'
      case 'correspondence':
        return 'Korrespondance'
      default:
        return 'Dokument'
    }
  }

  const highlightText = (text: string, terms: string[]) => {
    if (terms.length === 0) return text

    let highlightedText = text
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      )
    })
    
    return highlightedText
  }

  const searchInContent = (content: string, searchTerm: string) => {
    if (!searchTerm) return content
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return content.replace(
      regex,
      '<mark class="bg-blue-200 px-1 rounded font-semibold">$1</mark>'
    )
  }

  if (documents.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="text-gray-400 text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Ingen dokumenter uploadet
        </h3>
        <p className="text-gray-600">
          Upload forsikringsdokumenter for at få personaliseret hjælp
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Document List */}
        <div className="lg:w-1/3">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Mine Dokumenter ({documents.length})
          </h3>
          
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <button
                key={index}
                onClick={() => handleDocumentSelect(doc)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedDocument?.name === doc.name
                    ? 'border-insurance-blue bg-insurance-light'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg">{getDocumentTypeIcon(doc.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getDocumentTypeName(doc.type)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Document Content */}
        <div className="lg:w-2/3">
          {selectedDocument && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDocument.name}
                </h3>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Søg i dokument..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-1 focus:ring-insurance-blue focus:border-insurance-blue"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
                <div 
                  className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: searchInContent(
                      highlightText(selectedDocument.content, highlightTerms),
                      searchTerm
                    )
                  }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Type: {getDocumentTypeName(selectedDocument.type)}
                </span>
                {selectedDocument.uploadDate && (
                  <span>
                    Uploadet: {selectedDocument.uploadDate.toLocaleDateString('da-DK')}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 