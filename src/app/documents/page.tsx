'use client'

import React, { useEffect, useState } from 'react'

interface Document {
  id: string
  filename: string
  analysis: {
    filesize: number
    pages: number
    wordCount: number
    documentType: string
    hasInsuranceKeywords: boolean
    extractedText: string
    fullText?: string
  }
}

interface ChatMessage {
  id: number
  text: string
  sender: 'user' | 'ai'
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<(Document & { fullText?: string })[]>([])
  const [selectedDocument, setSelectedDocument] = useState<(Document & { fullText?: string }) | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)

  useEffect(() => {
    try {
      const cached = localStorage.getItem('uploadedDocuments')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) setDocuments(parsed)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('uploadedDocuments', JSON.stringify(documents))
    } catch {}
  }, [documents])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok || !result?.success) throw new Error(result?.error || 'Upload fejlede')

      const doc: Document & { fullText?: string } = {
        id: result.document.id,
        filename: result.document.filename,
        analysis: result.document.analysis,
        fullText: result.document.analysis.fullText,
      }

      setDocuments((prev) => [...prev, doc])
      setSelectedDocument(doc)
      setChatMessages([
        {
          id: 1,
          text: `Dokument "${doc.filename}" er uploadet og klar til analyse. Dette er et ${doc.analysis.documentType} dokument med ${doc.analysis.pages} sider. Stil mig et spørgsmål om dokumentet!`,
          sender: 'ai',
        },
      ])
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload fejlede')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const analyzeDocument = async (question?: string) => {
    if (!selectedDocument) return
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocument.id,
          question,
          documentText: selectedDocument.fullText || selectedDocument.analysis.fullText,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Analyse fejlede')
      return result.analysis
    } catch (error) {
      console.error('Analysis error:', error)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedDocument) return
    const userMessage: ChatMessage = { id: Date.now(), text: chatInput, sender: 'user' }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setIsChatting(true)
    try {
      const analysis = await analyzeDocument(chatInput)
      const aiMessage: ChatMessage = { id: Date.now() + 1, text: analysis || 'Kunne ikke analysere dokumentet.', sender: 'ai' }
      setChatMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      const errorMessage: ChatMessage = { id: Date.now() + 1, text: `⚠️ Fejl: ${error instanceof Error ? error.message : 'Ukendt fejl'}`, sender: 'ai' }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsChatting(false)
    }
  }

  const selectDocument = (doc: Document & { fullText?: string }) => {
    setSelectedDocument(doc)
    setChatMessages([
      {
        id: 1,
        text: `Du har valgt "${doc.filename}". Dette er et ${doc.analysis.documentType} dokument med ${doc.analysis.pages} sider og ${doc.analysis.wordCount} ord. Stil mig spørgsmål om indholdet!`,
        sender: 'ai',
      },
    ])
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📁 Dokumentanalyse</h1>
        <p className="text-gray-600">Upload dine forsikringspolicer og chat med AI om indholdet</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upload og Document Liste */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Dokument</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className={`cursor-pointer inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${isUploading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {isUploading ? 'Uploader...' : '📄 Vælg PDF fil'}
              </label>
              <p className="text-sm text-gray-500 mt-2">Maksimum 10MB</p>
            </div>
            {uploadError && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{uploadError}</div>}
          </div>

          {documents.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Uploadede Dokumenter</h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} onClick={() => selectDocument(doc)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedDocument?.id === doc.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="text-sm font-medium text-gray-900 truncate">{doc.filename}</div>
                    <div className="text-xs text-gray-500">{doc.analysis.documentType} • {doc.analysis.pages} sider</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          {selectedDocument ? (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Chat om: {selectedDocument.filename}</h2>
                  <p className="text-sm text-gray-500">{selectedDocument.analysis.documentType} • {selectedDocument.analysis.pages} sider • {selectedDocument.analysis.wordCount} ord</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => analyzeDocument()} disabled={isAnalyzing} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {isAnalyzing ? 'Analyserer...' : '🔍 Analyser'}
                  </button>
                </div>
              </div>

              <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`mb-4 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block max-w-xs lg:max-w-2xl px-4 py-2 rounded-lg whitespace-pre-wrap ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      {message.text}
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="text-left">
                    <div className="inline-block bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Stil spørgsmål om dokumentet..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isChatting} />
                <button onClick={sendChatMessage} disabled={isChatting || !chatInput.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Send
                </button>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Hurtige spørgsmål:</p>
                <div className="flex flex-wrap gap-2">
                  {['Hvad er min selvrisiko?', 'Hvad dækker min forsikring?', 'Hvad koster min præmie?', 'Hvilke begrænsninger er der?', 'Sammenlign med andre forsikringer'].map((question) => (
                    <button key={question} onClick={() => setChatInput(question)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload et dokument for at starte</h2>
              <p className="text-gray-600">Vælg en PDF fil med din forsikringspolice for at chatte med AI om indholdet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}