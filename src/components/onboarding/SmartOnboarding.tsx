'use client'

import { useState } from 'react'
import { useUserProfileStore } from '@/lib/store/userProfileStore'

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: '👋 Velkommen til AI Forsikringsguiden',
    description: 'Lad os lave din personlige forsikringsprofil på 3 minutter'
  },
  {
    id: 2,
    title: '👤 Fortæl os om dig selv',
    description: 'Grundlæggende oplysninger hjælper os med at give bedre råd'
  },
  {
    id: 3,
    title: '🏠 Din livssituation',
    description: 'Bolig, køretøjer og familie påvirker dine forsikringsbehov'
  },
  {
    id: 4,
    title: '🛡️ Dine præferencer',
    description: 'Hvor meget risiko ønsker du, og hvordan vil du kommunikere?'
  },
  {
    id: 5,
    title: '📄 Samtykke og privatliv',
    description: 'Vælg hvilke data vi må bruge til at hjælpe dig'
  }
]

export default function SmartOnboarding() {
  const { 
    profile, 
    updateProfile, 
    updateAssets, 
    updateConsent, 
    completeOnboarding,
    completeOnboardingStep 
  } = useUserProfileStore()
  
  const [currentStep, setCurrentStep] = useState(profile.onboardingStep || 1)
  const [formData, setFormData] = useState({
    // Basic info
    age: profile.age || '',
    location: profile.location || '',
    familyStatus: profile.familyStatus || '',
    children: profile.children || 0,
    occupation: profile.occupation || '',
    income: profile.income || '',
    
    // Assets
    homeType: profile.assets?.home?.type || '',
    homeValue: profile.assets?.home?.value || '',
    hasVehicles: (profile.assets?.vehicles?.length || 0) > 0,
    
    // Preferences
    riskTolerance: profile.riskTolerance || '',
    
    // Consent
    analytics: profile.dataConsent?.analytics || false,
    marketing: profile.dataConsent?.marketing || false,
    proactiveMonitoring: profile.dataConsent?.proactiveMonitoring || false
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNextStep = () => {
    // Save current step data
    saveStepData()
    
    if (currentStep < ONBOARDING_STEPS.length) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      completeOnboardingStep(nextStep)
    } else {
      // Complete onboarding
      completeOnboarding()
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const saveStepData = () => {
    switch (currentStep) {
      case 2:
        updateProfile({
          age: formData.age ? parseInt(formData.age.toString()) : undefined,
          location: formData.location,
          familyStatus: formData.familyStatus as any,
          children: formData.children,
          occupation: formData.occupation,
          income: formData.income ? parseInt(formData.income.toString()) : undefined
        })
        break
      case 3:
        updateAssets({
          home: formData.homeType ? {
            type: formData.homeType as 'owned' | 'rented',
            value: formData.homeValue ? parseInt(formData.homeValue.toString()) : 0
          } : undefined,
          vehicles: formData.hasVehicles ? [{
            type: 'Bil',
            value: 100000,
            year: new Date().getFullYear() - 5
          }] : []
        })
        break
      case 4:
        updateProfile({
          riskTolerance: formData.riskTolerance as any
        })
        break
      case 5:
        updateConsent({
          analytics: formData.analytics,
          marketing: formData.marketing,
          proactiveMonitoring: formData.proactiveMonitoring
        })
        break
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🛡️</div>
            <h2 className="text-2xl font-bold text-gray-900">
              Danmarks smarteste forsikringsassistent
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Vi hjælper dig med at forstå, optimere og administrere dine forsikringer 
              med AI-teknologi og danske eksperter.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-800 font-semibold mb-2">🚀 Hvad får du?</div>
              <ul className="text-blue-700 text-sm space-y-1 text-left">
                <li>• Personlig tryghedsscore og analyse</li>
                <li>• Automatisk markedsmonitorering</li>
                <li>• Proaktive anbefalinger ved livsændringer</li>
                <li>• Hjælp til skadessager og optimering</li>
              </ul>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Grundlæggende oplysninger</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alder
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="f.eks. 35"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bopæl (postnummer)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="f.eks. 2100"
                />
              </div>
              
              <div>
                <label htmlFor="onboarding-family-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Familiestand
                </label>
                <select
                  id="onboarding-family-status"
                  value={formData.familyStatus}
                  onChange={(e) => handleInputChange('familyStatus', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  title="Vælg din familiestand"
                >
                  <option value="">Vælg...</option>
                  <option value="single">Single</option>
                  <option value="married">Gift/sambo</option>
                  <option value="divorced">Fraskilt</option>
                  <option value="widowed">Enke/enkemand</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="onboarding-children" className="block text-sm font-medium text-gray-700 mb-1">
                  Antal børn
                </label>
                <input
                  id="onboarding-children"
                  type="number"
                  value={formData.children}
                  onChange={(e) => handleInputChange('children', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="f.eks. 2"
                  min="0"
                  max="10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Erhverv
                </label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="f.eks. Lærer, IT-konsulent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Årlig indkomst (ca.)
                </label>
                <input
                  type="number"
                  value={formData.income}
                  onChange={(e) => handleInputChange('income', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="500000"
                />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Din livssituation</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Boligsituation
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('homeType', 'owned')}
                    className={`p-4 border rounded-lg text-center ${
                      formData.homeType === 'owned' 
                        ? 'border-blue-600 bg-blue-50 text-blue-600' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">🏠</div>
                    <div className="font-medium">Ejer</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('homeType', 'rented')}
                    className={`p-4 border rounded-lg text-center ${
                      formData.homeType === 'rented' 
                        ? 'border-blue-600 bg-blue-50 text-blue-600' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">🏢</div>
                    <div className="font-medium">Lejer</div>
                  </button>
                </div>
              </div>
              
              {formData.homeType === 'owned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Boligens værdi (ca.)
                  </label>
                  <input
                    type="number"
                    value={formData.homeValue}
                    onChange={(e) => handleInputChange('homeValue', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="2500000"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Har du bil eller motorcykel?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('hasVehicles', true)}
                    className={`p-4 border rounded-lg text-center ${
                      formData.hasVehicles 
                        ? 'border-blue-600 bg-blue-50 text-blue-600' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">🚗</div>
                    <div className="font-medium">Ja</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('hasVehicles', false)}
                    className={`p-4 border rounded-lg text-center ${
                      !formData.hasVehicles 
                        ? 'border-blue-600 bg-blue-50 text-blue-600' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">🚶</div>
                    <div className="font-medium">Nej</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Dine præferencer</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risikotolerance
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Hvor meget risiko ønsker du at tage for at spare penge på forsikringer?
              </p>
              
              <div className="space-y-3">
                {[
                  { value: 'low', icon: '🛡️', title: 'Lav risiko', desc: 'Jeg vil være maksimalt sikret' },
                  { value: 'medium', icon: '⚖️', title: 'Moderat risiko', desc: 'Balance mellem sikkerhed og pris' },
                  { value: 'high', icon: '💰', title: 'Høj risiko', desc: 'Jeg vil spare mest muligt' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('riskTolerance', option.value)}
                    className={`w-full p-4 border rounded-lg text-left ${
                      formData.riskTolerance === option.value 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{option.icon}</span>
                      <div>
                        <div className="font-medium">{option.title}</div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Samtykke og privatliv</h3>
            <p className="text-gray-600">
              Vi respekterer dit privatliv. Vælg hvilke funktioner du ønsker at aktivere.
            </p>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.analytics}
                    onChange={(e) => handleInputChange('analytics', e.target.checked)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium">📊 Analyse og forbedring</div>
                    <div className="text-sm text-gray-600">
                      Tillad anonyme analyser for at forbedre vores service
                    </div>
                  </div>
                </label>
              </div>
              
              <div className="border rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.proactiveMonitoring}
                    onChange={(e) => handleInputChange('proactiveMonitoring', e.target.checked)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium">🔍 Proaktiv overvågning</div>
                    <div className="text-sm text-gray-600">
                      Lad os overvåge markedet og advare dig om bedre tilbud eller risici
                    </div>
                  </div>
                </label>
              </div>
              
              <div className="border rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.marketing}
                    onChange={(e) => handleInputChange('marketing', e.target.checked)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium">📧 Markedsføring</div>
                    <div className="text-sm text-gray-600">
                      Modtag tips og tilbud relateret til forsikringer
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )

      default:
        return <div>Ukendt trin</div>
    }
  }

  const currentStepData = ONBOARDING_STEPS.find(step => step.id === currentStep)
  const progress = ((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 100

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">
            Trin {currentStep} af {ONBOARDING_STEPS.length}
          </div>
          <div className="text-sm text-gray-600">
            {Math.round(progress)}% fuldført
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepData?.title}
          </h2>
          <p className="text-gray-600">
            {currentStepData?.description}
          </p>
        </div>

        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Tilbage
          </button>
          
          <button
            onClick={handleNextStep}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {currentStep === ONBOARDING_STEPS.length ? '✅ Færdig' : 'Næste →'}
          </button>
        </div>
      </div>
    </div>
  )
} 