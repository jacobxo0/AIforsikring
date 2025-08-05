'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuthStore } from '@/lib/store/authStore'
import { useInsuranceStore } from '@/lib/store/insuranceStore'

interface Policy {
  id: string
  policyNumber: string
  policyType: string
  companyName: string
  coverageAmount: number
  premiumAmount: number
  startDate: string
  endDate: string
  status: 'active' | 'expired' | 'cancelled'
  documentId?: string
  extractedData?: Record<string, unknown>
  riskFlags?: Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
  }>
}

export default function PolicyManager() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Mock user for demo
    const user = { id: 'demo-user', email: 'demo@example.com' }
    if (!user) return

    setUploading(true)
    
    for (const file of acceptedFiles) {
      try {
        // Upload file
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'insurance_policy')

        const uploadResponse = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(`Upload failed: ${errorData.error || uploadResponse.statusText}`)
        }

        const uploadResult = await uploadResponse.json()
        
        // Create document object from upload result
        const document = {
          id: uploadResult.fileId || crypto.randomUUID(),
          filename: uploadResult.filename || file.name,
          originalname: file.name
        }
        
        // Analyze policy with AI
        setAnalyzing(document.id)
        const analysisResponse = await fetch('/api/policies/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documentId: document.id,
            fileName: file.name,
            fileId: uploadResult.fileId,
            savedFileName: uploadResult.savedFileName
          })
        })

        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json()
          
          // Add to policies list
          const newPolicy: Policy = {
            id: crypto.randomUUID(),
            policyNumber: analysis.policyNumber || 'Ukendt',
            policyType: analysis.policyType || 'Ukendt type',
            companyName: analysis.companyName || 'Ukendt selskab',
            coverageAmount: analysis.coverageAmount || 0,
            premiumAmount: analysis.premiumAmount || 0,
            startDate: analysis.startDate || new Date().toISOString().split('T')[0],
            endDate: analysis.endDate || new Date().toISOString().split('T')[0],
            status: analysis.status || 'active',
            documentId: document.id,
            extractedData: analysis,
            riskFlags: analysis.riskFlags || []
          }

          setPolicies(prev => [...prev, newPolicy])
        }

      } catch (error) {
        console.error('Error processing file:', error)
        alert(`Fejl ved behandling af ${file.name}: ${error}`)
      } finally {
        setAnalyzing(null)
      }
    }

    setUploading(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📄 Mine Forsikringspolicer</h2>
            <p className="text-gray-600 mt-2">
              Upload dine forsikringspolicer for AI-analyse og sammenligning
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-insurance-blue">{policies.length}</div>
            <div className="text-sm text-gray-500">Policer uploadet</div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔺 Upload Nye Policer</h3>
        
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-insurance-blue bg-insurance-light' 
              : 'border-gray-300 hover:border-insurance-blue'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} disabled={uploading} />
          
          {uploading ? (
            <div className="space-y-3">
              <div className="text-2xl">⏳</div>
              <div className="text-insurance-blue font-medium">Uploader og analyserer...</div>
              {analyzing && (
                <div className="text-sm text-gray-600">
                  AI analyserer dokument for risikofaktorer...
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl text-gray-400">📄</div>
              <div className="text-lg font-medium text-gray-700">
                {isDragActive ? 'Slip filerne her...' : 'Træk forsikringspolicer hertil'}
              </div>
              <div className="text-sm text-gray-500">
                eller klik for at vælge filer (PDF, Word, billeder)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Policies List */}
      {policies.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">📋 Dine Policer</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {policies.map((policy) => (
              <div 
                key={policy.id} 
                className="p-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedPolicy(policy)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">
                        {policy.companyName} - {policy.policyType}
                      </h4>
                      <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${policy.status === 'active' ? 'bg-green-100 text-green-800' : 
                          policy.status === 'expired' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {policy.status === 'active' ? 'Aktiv' : 
                         policy.status === 'expired' ? 'Udløbet' : 'Annulleret'}
                      </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Police nr:</span> {policy.policyNumber}
                      </div>
                      <div>
                        <span className="font-medium">Dækning:</span> {policy.coverageAmount.toLocaleString('da-DK')} kr
                      </div>
                      <div>
                        <span className="font-medium">Præmie:</span> {policy.premiumAmount.toLocaleString('da-DK')} kr/år
                      </div>
                      <div>
                        <span className="font-medium">Udløber:</span> {new Date(policy.endDate).toLocaleDateString('da-DK')}
                      </div>
                    </div>

                    {/* Risk Flags */}
                    {policy.riskFlags && policy.riskFlags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {policy.riskFlags.map((flag, idx) => (
                          <span 
                            key={idx}
                            className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(flag.severity)}`}
                            title={flag.description}
                          >
                            ⚠️ {flag.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 text-right">
                    <button className="text-insurance-blue hover:text-insurance-dark text-sm font-medium">
                      Se detaljer →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policy Detail Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                📄 {selectedPolicy.companyName} - {selectedPolicy.policyType}
              </h3>
              <button 
                onClick={() => setSelectedPolicy(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Policy Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Police nummer</label>
                  <div className="text-lg text-gray-900">{selectedPolicy.policyNumber}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="text-lg text-gray-900">{selectedPolicy.status}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dækningssum</label>
                  <div className="text-lg text-gray-900">{selectedPolicy.coverageAmount.toLocaleString('da-DK')} kr</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Årlig præmie</label>
                  <div className="text-lg text-gray-900">{selectedPolicy.premiumAmount.toLocaleString('da-DK')} kr</div>
                </div>
              </div>

              {/* Risk Flags Detail */}
              {selectedPolicy.riskFlags && selectedPolicy.riskFlags.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Identificerede Risikofaktorer</h4>
                  <div className="space-y-3">
                    {selectedPolicy.riskFlags.map((flag, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                        flag.severity === 'critical' ? 'border-red-500 bg-red-50' :
                        flag.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                        flag.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">{flag.title}</h5>
                            <p className="text-gray-700 mt-1">{flag.description}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(flag.severity)}`}>
                            {flag.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <button 
                onClick={() => setSelectedPolicy(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Luk
              </button>
              <button className="px-4 py-2 bg-insurance-blue text-white rounded-lg hover:bg-insurance-dark">
                Start sammenligning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 