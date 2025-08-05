'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInsuranceStore } from '@/lib/store/insuranceStore'
import { useUserProfileStore } from '@/lib/store/userProfileStore'
import TryghedsscoreDashboard from './TryghedsscoreDashboard'
import SmartOnboarding from '../onboarding/SmartOnboarding'

interface DashboardMetrics {
  totalPolicies: number
  totalPremium: number
  totalCoverage: number
  upcomingRenewals: number
  riskScore: number
  recommendations: string[]
}

export default function InsightsDashboard() {
  const { policies, insights } = useInsuranceStore()
  const { 
    profile, 
    getCompletionPercentage, 
    getMissingCriticalInfo,
    getUnhandledLifeEvents 
  } = useUserProfileStore()
  
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPolicies: 0,
    totalPremium: 0,
    totalCoverage: 0,
    upcomingRenewals: 0,
    riskScore: 0,
    recommendations: []
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'tryghed' | 'profile'>('overview')

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const refreshInsights = useCallback(async () => {
    if (loading) return
    
    setLoading(true)
    try {
      // Calculate metrics from policies
      const totalPolicies = policies.length
      const totalPremium = policies.reduce((sum, policy) => sum + (policy.premium_amount || 0), 0)
      const totalCoverage = policies.reduce((sum, policy) => {
        // Try to extract coverage from coverage_details JSON
        try {
          const details = typeof policy.coverage_details === 'string' 
            ? JSON.parse(policy.coverage_details) 
            : policy.coverage_details as any
          return sum + (details?.coverage_amount || details?.amount || 0)
        } catch {
          return sum
        }
      }, 0)
      const upcomingRenewals = policies.filter(policy => {
        if (!policy.end_date) return false
        const endDate = new Date(policy.end_date)
        const threeMonthsFromNow = new Date()
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
        return endDate <= threeMonthsFromNow
      }).length
      
      // Mock risk score calculation
      const riskScore = calculateRiskScore(policies, profile)
      
      setMetrics({
        totalPolicies,
        totalPremium,
        totalCoverage,
        upcomingRenewals,
        riskScore,
        recommendations: generateRecommendations(policies, profile)
      })
    } catch (error) {
      console.error('Error refreshing insights:', error)
    } finally {
      setLoading(false)
    }
  }, [policies, profile, loading])

  useEffect(() => {
    refreshInsights()
  }, [refreshInsights])

  // Prevent hydration mismatch by waiting for client mount
  if (!mounted) {
    return <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  }

  // Show onboarding if profile is not complete
  const completionPercentage = getCompletionPercentage()
  const missingInfo = getMissingCriticalInfo()
  const unhandledEvents = getUnhandledLifeEvents()

  if (!profile.onboardingCompleted && completionPercentage < 80) {
    return <SmartOnboarding />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600 bg-green-100'
    if (score <= 60) return 'text-yellow-600 bg-yellow-100'
    if (score <= 80) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Profile Completion Banner */}
      {completionPercentage < 100 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                🎯 Forbedre din profil ({completionPercentage}% fuldført)
              </h3>
              <p className="text-blue-700 text-sm">
                Manglende info: {missingInfo.join(', ')}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('profile')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Udfyld nu
            </button>
          </div>
        </div>
      )}

      {/* Unhandled Life Events */}
      {unhandledEvents && unhandledEvents.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 mb-2">
            ⚡ Livsbegivenheder kræver handling
          </h3>
          <ul className="space-y-1">
            {unhandledEvents.map(event => (
              <li key={event.id} className="text-orange-800 text-sm">
                • {event.type} ({new Date(event.date).toLocaleDateString('da-DK')})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: '📊 Oversigt', icon: '📊' },
            { id: 'tryghed', label: '🛡️ Tryghedsscore', icon: '🛡️' },
            { id: 'profile', label: '👤 Profil', icon: '👤' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-insurance-blue text-insurance-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Forsikringer"
              value={metrics.totalPolicies.toString()}
              icon="📋"
              subtitle="Aktive policer"
            />
            <MetricCard
              title="Årlig præmie"
              value={formatCurrency(metrics.totalPremium)}
              icon="💰"
              subtitle="Samlet beløb"
            />
            <MetricCard
              title="Samlet dækning"
              value={formatCurrency(metrics.totalCoverage)}
              icon="🛡️"
              subtitle="Forsikringssum"
            />
            <MetricCard
              title="Fornyelser"
              value={metrics.upcomingRenewals.toString()}
              icon="📅"
              subtitle="Næste 3 måneder"
              alert={metrics.upcomingRenewals > 0}
            />
          </div>

          {/* Risk Assessment */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">🔍 Risikovurdering</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(metrics.riskScore)}`}>
                {metrics.riskScore <= 30 ? 'Lav risiko' : 
                 metrics.riskScore <= 60 ? 'Moderat risiko' : 
                 metrics.riskScore <= 80 ? 'Forhøjet risiko' : 'Høj risiko'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  metrics.riskScore <= 30 ? 'bg-green-500' : 
                  metrics.riskScore <= 60 ? 'bg-yellow-500' : 
                  metrics.riskScore <= 80 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, metrics.riskScore))}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              Baseret på dine forsikringer, profil og markedsdata
            </p>
          </div>

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Anbefalinger</h3>
              <ul className="space-y-3">
                {metrics.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-insurance-blue text-white rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent Insights */}
          {insights.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">📈 Seneste indsigter</h3>
                <button
                  onClick={refreshInsights}
                  disabled={loading}
                  className="text-insurance-blue hover:text-insurance-dark text-sm font-medium disabled:opacity-50"
                >
                  {loading ? '🔄 Opdaterer...' : '🔄 Opdater'}
                </button>
              </div>
              <div className="space-y-3">
                {insights.slice(0, 5).map((insight) => (
                  <div key={insight.id} className="border-l-4 border-insurance-blue pl-4 py-2">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(insight.created_at).toLocaleDateString('da-DK')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tryghed' && (
        <TryghedsscoreDashboard />
      )}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Din profil</h3>
          <ProfileEditor />
        </div>
      )}
    </div>
  )
}

// Helper component for metric cards
function MetricCard({ 
  title, 
  value, 
  icon, 
  subtitle, 
  alert = false 
}: { 
  title: string
  value: string
  icon: string
  subtitle: string
  alert?: boolean 
}) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${alert ? 'ring-2 ring-orange-200' : ''}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

// Simplified profile editor component
function ProfileEditor() {
  const { profile, updateProfile, getCompletionPercentage } = useUserProfileStore()
  const [formData, setFormData] = useState({
    age: profile.age || '',
    location: profile.location || '',
    familyStatus: profile.familyStatus || '',
    children: profile.children || 0,
    occupation: profile.occupation || '',
    income: profile.income || ''
  })

  const handleSave = () => {
    updateProfile({
      age: formData.age ? parseInt(formData.age.toString()) : undefined,
      location: formData.location,
      familyStatus: formData.familyStatus as any,
      children: formData.children,
      occupation: formData.occupation,
      income: formData.income ? parseInt(formData.income.toString()) : undefined
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">Grundlæggende oplysninger</h4>
          <p className="text-sm text-gray-600">
            {getCompletionPercentage()}% fuldført
          </p>
        </div>
        <button
          onClick={handleSave}
          className="bg-insurance-blue text-white px-4 py-2 rounded-lg hover:bg-insurance-dark"
        >
          Gem ændringer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="age-input" className="block text-sm font-medium text-gray-700 mb-1">Alder</label>
          <input
            id="age-input"
            type="number"
            value={formData.age}
            onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="f.eks. 35"
          />
        </div>
        
        <div>
          <label htmlFor="location-input" className="block text-sm font-medium text-gray-700 mb-1">Postnummer</label>
          <input
            id="location-input"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="f.eks. 2100"
          />
        </div>
        
        <div>
          <label htmlFor="family-status-select" className="block text-sm font-medium text-gray-700 mb-1">Familiestand</label>
          <select
            id="family-status-select"
            value={formData.familyStatus}
            onChange={(e) => setFormData(prev => ({ ...prev, familyStatus: e.target.value }))}
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
          <label htmlFor="children-input" className="block text-sm font-medium text-gray-700 mb-1">Antal børn</label>
          <input
            id="children-input"
            type="number"
            value={formData.children}
            onChange={(e) => setFormData(prev => ({ ...prev, children: parseInt(e.target.value) || 0 }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="f.eks. 2"
            min="0"
          />
        </div>
        
        <div>
          <label htmlFor="occupation-input" className="block text-sm font-medium text-gray-700 mb-1">Erhverv</label>
          <input
            id="occupation-input"
            type="text"
            value={formData.occupation}
            onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="f.eks. Lærer"
          />
        </div>
        
        <div>
          <label htmlFor="income-input" className="block text-sm font-medium text-gray-700 mb-1">Årlig indkomst</label>
          <input
            id="income-input"
            type="number"
            value={formData.income}
            onChange={(e) => setFormData(prev => ({ ...prev, income: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="f.eks. 450000"
          />
        </div>
      </div>
    </div>
  )
}

// Helper functions
function calculateRiskScore(policies: any[], profile: any): number {
  let score = 50 // Base score
  
  // Reduce score for good coverage
  if (policies.length >= 3) score -= 10
  if (profile.age && profile.age > 25) score -= 5
  if (profile.familyStatus === 'married') score -= 5
  if (profile.assets?.home?.type === 'owned') score -= 10
  
  // Increase score for risk factors
  if (policies.length === 0) score += 30
  if (!profile.occupation) score += 10
  if (!profile.income) score += 5
  
  return Math.max(0, Math.min(100, score))
}

function generateRecommendations(policies: any[], profile: any): string[] {
  const recommendations = []
  
  if (policies.length === 0) {
    recommendations.push('Start med at tilføje dine eksisterende forsikringer')
  }
  
  if (!profile.assets?.home) {
    recommendations.push('Registrer din bolig for personlig indboforsikringsrådgivning')
  }
  
  if (profile.familyStatus === 'married' && !policies.some(p => p.type?.includes('liv'))) {
    recommendations.push('Overvej livsforsikring når du har familie')
  }
  
  if (policies.length > 0) {
    recommendations.push('Sammenlign dine nuværende priser med markedet')
  }
  
  recommendations.push('Upload dine policedokumenter for AI-analyse')
  
  return recommendations.slice(0, 4)
} 