'use client'

import ChatWindow from '@/components/chat/ChatWindow'
import PDFUpload from '@/components/PDFUpload'
import PolicyManager from '@/components/insurance/PolicyManager'
import PolicyComparison from '@/components/insurance/PolicyComparison'
import InsightsDashboard from '@/components/dashboard/InsightsDashboard'
import ProactiveAgent from '@/components/ProactiveAgent'
import { useUserProfileStore } from '@/lib/store/userProfileStore'
import { useState, useEffect } from 'react'

interface Document {
  name: string
  content: string
  type: string
  uploadDate: Date
}

export default function Home() {
  const { profile, getCompletionPercentage } = useUserProfileStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [currentView, setCurrentView] = useState<'dashboard' | 'chat' | 'policies' | 'comparison' | 'agent'>('dashboard')
  
  // Redirect to onboarding if profile is incomplete
  const completionPercentage = getCompletionPercentage()
  
  useEffect(() => {
    if (!profile.onboardingCompleted && completionPercentage < 50) {
      setCurrentView('dashboard') // Dashboard will show onboarding
    }
  }, [profile.onboardingCompleted, completionPercentage])

  const handleDocumentParsed = (document: { name: string; content: string; type: string }) => {
    const newDocument: Document = {
      ...document,
      uploadDate: new Date()
    }
    setDocuments(prev => [...prev, newDocument])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🛡️ AI Forsikringsguiden
            </h1>
            <p className="text-lg text-gray-600">
              Intelligent forsikringsrådgivning med AI-drevet analyse og sammenligning
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-center">
            <div className="bg-white rounded-lg shadow p-1 inline-flex">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-insurance-blue text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setCurrentView('chat')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'chat'
                    ? 'bg-insurance-blue text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setCurrentView('policies')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'policies'
                    ? 'bg-insurance-blue text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📄 Policer
              </button>
              <button
                onClick={() => setCurrentView('comparison')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'comparison'
                    ? 'bg-insurance-blue text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ⚖️ Sammenlign
              </button>
              <button
                onClick={() => setCurrentView('agent')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'agent'
                    ? 'bg-insurance-blue text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🤖 AI-Agent
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && <InsightsDashboard />}

          {currentView === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left sidebar - Upload & Documents */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    📄 Upload Dokument
                  </h2>
                  <PDFUpload onDocumentParsed={handleDocumentParsed} />
                </div>

                {documents.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      📂 Dine Dokumenter ({documents.length})
                    </h2>
                    <div className="space-y-3">
                      {documents.slice(0, 5).map((doc, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedDocument(doc)}
                          className={`w-full text-left p-3 rounded-lg border hover:border-insurance-blue hover:bg-insurance-blue/5 transition-colors ${
                            selectedDocument?.name === doc.name 
                              ? 'bg-insurance-blue/10 border-insurance-blue' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900 truncate">{doc.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{doc.type}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {doc.uploadDate.toLocaleDateString('da-DK')}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Main chat area */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      🤖 AI Forsikringsrådgiver
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      Still spørgsmål om forsikring eller upload dokumenter til analyse
                    </p>
                  </div>

                  <div className="flex-1 p-4">
                    <ChatWindow />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'policies' && <PolicyManager />}
          
          {currentView === 'comparison' && <PolicyComparison />}

          {currentView === 'agent' && <ProactiveAgent />}
        </div>
      </div>
    </div>
  )
}