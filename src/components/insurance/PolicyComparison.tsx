'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface PolicyOffer {
  id: string
  companyName: string
  productName: string
  annualPremium: number
  coverageAmount: number
  deductible: number
  advantages: string[]
  disadvantages: string[]
  riskWarnings: Array<{
    type: 'exclusion' | 'limitation' | 'twist' | 'ambiguity'
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    sourceText: string
    potentialImpact: string
  }>
  aiScore: number
  confidence: number
}

interface ExistingPolicy {
  id: string
  companyName: string
  policyType: string
  annualPremium: number
  coverageAmount: number
  deductible: number
}

export default function PolicyComparison() {
  const [existingPolicies] = useState<ExistingPolicy[]>([
    {
      id: '1',
      companyName: 'Alka',
      policyType: 'Bilforsikring',
      annualPremium: 8500,
      coverageAmount: 2000000,
      deductible: 5000
    }
  ])
  
  const [newOffers, setNewOffers] = useState<PolicyOffer[]>([])
  const [uploading, setUploading] = useState(false)
  // const [analyzing, setAnalyzing] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    
          for (const _ of acceptedFiles) {
      try {
        // Simulate upload and analysis
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Mock analysis result
        const mockOffer: PolicyOffer = {
          id: crypto.randomUUID(),
          companyName: 'Tryg',
          productName: 'Kasko Plus',
          annualPremium: 7800,
          coverageAmount: 2500000,
          deductible: 4000,
          advantages: [
            'Lavere årlig præmie (-700 kr)',
            'Højere dækningssum (+500.000 kr)',
            'Lavere selvrisiko (-1.000 kr)',
            'Inkluderet redning i hele Europa'
          ],
          disadvantages: [
            'Begrænsninger ved køb af brugtbil',
            'Højere selvrisiko ved natskader',
            'Ekskluderer skader under spirituspåvirkning'
          ],
          riskWarnings: [
            {
              type: 'exclusion',
              severity: 'high',
              title: 'Skjult begrænsning ved lånebil',
              description: 'Policen dækker ikke hvis lånebilen er ældre end 10 år',
              sourceText: 'Erstatning ydes ikke for køretøjer ældre end 10 år ved første registrering',
              potentialImpact: 'Du kan miste al dækning hvis du låner en ældre bil'
            },
            {
              type: 'twist',
              severity: 'critical',
              title: 'Problematisk beviskriterium',
              description: 'Kræver video dokumentation for skader over 25.000 kr',
              sourceText: 'Ved skader overstigende 25.000 kr skal skadeårsag dokumenteres ved video',
              potentialImpact: 'Næsten umuligt at bevise skadeårsag bagudrettet'
            }
          ],
          aiScore: 78,
          confidence: 0.85
        }

        setNewOffers(prev => [...prev, mockOffer])

      } catch (error) {
        console.error('Error processing file:', error)
      }
    }

    setUploading(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: true
  })

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800'
      case 'high': return 'border-orange-500 bg-orange-50 text-orange-800'
      case 'medium': return 'border-yellow-500 bg-yellow-50 text-yellow-800'
      case 'low': return 'border-blue-500 bg-blue-50 text-blue-800'
      default: return 'border-gray-500 bg-gray-50 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">⚖️ Sammenlign Forsikringstilbud</h2>
            <p className="text-gray-600 mt-2">
              Upload nye tilbud og få AI-drevet analyse af fordele, ulemper og risikofaktorer
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-insurance-blue">{newOffers.length}</div>
            <div className="text-sm text-gray-500">Tilbud analyseret</div>
          </div>
        </div>
      </div>

      {/* Current Policies Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Dine Nuværende Policer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {existingPolicies.map((policy) => (
            <div key={policy.id} className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900">{policy.companyName}</h4>
              <p className="text-sm text-gray-600">{policy.policyType}</p>
              <div className="mt-2 space-y-1 text-sm">
                <div>Præmie: {policy.annualPremium.toLocaleString('da-DK')} kr/år</div>
                <div>Dækning: {policy.coverageAmount.toLocaleString('da-DK')} kr</div>
                <div>Selvrisiko: {policy.deductible.toLocaleString('da-DK')} kr</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload New Offers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 Upload Nye Tilbud</h3>
        
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
              <div className="text-2xl">🔍</div>
              <div className="text-insurance-blue font-medium">AI analyserer og sammenligner...</div>
              <div className="text-sm text-gray-600">
                Identificerer problematiske klausuler og skjulte begrænsninger
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl text-gray-400">📄</div>
              <div className="text-lg font-medium text-gray-700">
                {isDragActive ? 'Slip tilbudene her...' : 'Træk forsikringstilbud hertil'}
              </div>
              <div className="text-sm text-gray-500">
                eller klik for at vælge filer (PDF, billeder)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Results */}
      {newOffers.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">📊 Sammenligning Resultater</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {newOffers.map((offer) => (
              <div key={offer.id} className="p-6">
                {/* Offer Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {offer.companyName} - {offer.productName}
                    </h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>Præmie: {offer.annualPremium.toLocaleString('da-DK')} kr/år</span>
                      <span>Dækning: {offer.coverageAmount.toLocaleString('da-DK')} kr</span>
                      <span>Selvrisiko: {offer.deductible.toLocaleString('da-DK')} kr</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(offer.aiScore)}`}>
                      AI Score: {offer.aiScore}/100
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Tillid: {Math.round(offer.confidence * 100)}%
                    </div>
                  </div>
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Advantages */}
                  <div>
                    <h5 className="font-medium text-green-800 mb-2">✅ Fordele</h5>
                    <ul className="space-y-1 text-sm">
                      {offer.advantages.map((advantage, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          <span>{advantage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Disadvantages */}
                  <div>
                    <h5 className="font-medium text-red-800 mb-2">❌ Ulemper</h5>
                    <ul className="space-y-1 text-sm">
                      {offer.disadvantages.map((disadvantage, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-red-600 mr-2">•</span>
                          <span>{disadvantage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Risk Warnings */}
                  <div>
                    <h5 className="font-medium text-orange-800 mb-2">⚠️ Risikofaktorer</h5>
                    <div className="space-y-2">
                      {offer.riskWarnings.map((warning, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded text-xs border ${getRiskColor(warning.severity)}`}
                        >
                          <div className="font-medium">{warning.title}</div>
                          <div className="mt-1">{warning.description}</div>
                          {warning.severity === 'critical' && (
                            <div className="mt-2 text-red-700 font-medium">
                              🚨 KRITISK: {warning.potentialImpact}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex justify-end space-x-3">
                  <button className="px-4 py-2 text-insurance-blue border border-insurance-blue rounded-lg hover:bg-insurance-light">
                    Se detaljeret sammenligning
                  </button>
                  <button className="px-4 py-2 bg-insurance-blue text-white rounded-lg hover:bg-insurance-dark">
                    Gem analyse
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 