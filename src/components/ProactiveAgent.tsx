'use client'

import { useState, useEffect } from 'react'
import { useUserProfileStore } from '@/lib/store/userProfileStore'

interface Alert {
  id: string
  type: 'critical' | 'high' | 'medium' | 'low'
  category: 'market' | 'life_event' | 'coverage' | 'cost'
  title: string
  description: string
  action?: string
  timestamp: string
  read: boolean
}

interface MarketData {
  companiesMonitored: number
  averageSavings: number
  lastUpdate: string
  trends: string[]
}

export default function ProactiveAgent() {
  const { profile, addLifeEvent } = useUserProfileStore()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    // Simulate proactive monitoring
    const interval = setInterval(() => {
      if (profile.dataConsent?.proactiveMonitoring) {
        generateMockAlerts()
        updateMarketData()
      }
    }, 30000) // Check every 30 seconds for demo

    // Initial check
    if (profile.dataConsent?.proactiveMonitoring) {
      generateMockAlerts()
      updateMarketData()
      setIsMonitoring(true)
    }

    return () => clearInterval(interval)
  }, [profile, mounted])

  const generateMockAlerts = () => {
    if (!mounted) return
    
    const now = new Date().toISOString()
    const newAlerts: Alert[] = []
    const randomSeed = Math.random()

    // Market opportunity alerts
    if (randomSeed > 0.7) {
      newAlerts.push({
        id: `market_${Date.now()}`,
        type: 'high',
        category: 'market',
        title: '💰 Besparelse fundet!',
        description: 'Ny konkurrencedygtig pris på indboforsikring hos Alka. Du kan spare op til 1.200 kr/år.',
        action: 'Se sammenligning',
        timestamp: now,
        read: false
      })
    }

    // Life event alerts
    if (profile.age && profile.age > 30 && !profile.children && randomSeed > 0.8) {
      newAlerts.push({
        id: `life_${Date.now()}`,
        type: 'medium',
        category: 'life_event',
        title: '🍼 Familieudvidelse?',
        description: 'Hvis I planlægger børn, bør I overveje livsforsikring. Vi kan rådgive om de bedste muligheder.',
        action: 'Få rådgivning',
        timestamp: now,
        read: false
      })
    }

    // Coverage gap alerts
    if (!profile.assets?.home && randomSeed > 0.6) {
      newAlerts.push({
        id: `coverage_${Date.now()}`,
        type: 'critical',
        category: 'coverage',
        title: '🏠 Manglende boligoplysninger',
        description: 'Vi kan ikke vurdere din indboforsikring uden boligdata. Dette kan efterlade dig udækket.',
        action: 'Tilføj boliginfo',
        timestamp: now,
        read: false
      })
    }

    // Cost optimization
    if (randomSeed > 0.75) {
      newAlerts.push({
        id: `cost_${Date.now()}`,
        type: 'medium',
        category: 'cost',
        title: '📊 Årlig gennemgang',
        description: 'Det er 12 måneder siden din sidste forsikringsgennemgang. Markedet har ændret sig.',
        action: 'Book gennemgang',
        timestamp: now,
        read: false
      })
    }

    setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)) // Keep only 10 latest
  }

  const updateMarketData = () => {
    if (!mounted) return
    
    setMarketData({
      companiesMonitored: 12,
      averageSavings: 2400 + Math.floor(Math.random() * 500),
      lastUpdate: new Date().toLocaleString('da-DK'),
      trends: [
        'Indboforsikring: Priser faldet 3% i Q4',
        'Livsforsikring: Nye produkter med bedre vilkår',
        'Bilforsikring: Øget fokus på unge førere'
      ]
    })
  }

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ))
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical': return '🚨'
      case 'high': return '🟠'
      case 'medium': return '🟡'
      case 'low': return '🔵'
      default: return '📢'
    }
  }

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50'
      case 'high': return 'border-orange-500 bg-orange-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      case 'low': return 'border-blue-500 bg-blue-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  const unreadAlerts = alerts.filter(alert => !alert.read)
  const displayAlerts = showAllAlerts ? alerts : alerts.slice(0, 3)

  if (!profile.dataConsent?.proactiveMonitoring) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Proaktiv AI-Agent
          </h3>
          <p className="text-gray-600 mb-4">
            Aktivér proaktiv overvågning for at få automatiske advarsler om markedsændringer, 
            besparelser og personlige anbefalinger.
          </p>
          <p className="text-sm text-gray-500">
            Du kan aktivere dette i dine privatlivs-indstillinger.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Panel */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            🤖 Proaktiv AI-Agent
          </h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isMonitoring ? 'Aktiv overvågning' : 'Offline'}
            </span>
          </div>
        </div>

        {marketData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 font-semibold">{marketData.companiesMonitored}</div>
              <div className="text-sm text-gray-700">Forsikringsselskaber overvåget</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 font-semibold">{marketData.averageSavings.toLocaleString()} kr</div>
              <div className="text-sm text-gray-700">Gennemsnitlig besparelse/år</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-purple-600 font-semibold">24/7</div>
              <div className="text-sm text-gray-700">Kontinuerlig overvågning</div>
            </div>
          </div>
        )}

        {/* Alerts Summary */}
        {unreadAlerts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-blue-600 font-semibold">
                  🔔 {unreadAlerts.length} nye opdateringer
                </span>
              </div>
              <button
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showAllAlerts ? 'Vis færre' : 'Vis alle'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📢 Seneste opdateringer
          </h3>
          
          <div className="space-y-3">
            {displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getAlertColor(alert.type)} ${
                  alert.read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">{getAlertIcon(alert.type)}</span>
                      <span className="font-semibold text-gray-900">{alert.title}</span>
                      {!alert.read && (
                        <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-2">{alert.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString('da-DK')}
                      </span>
                      
                      <div className="flex space-x-2">
                        {alert.action && (
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            {alert.action}
                          </button>
                        )}
                        
                        {!alert.read && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            Markér som læst
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Trends */}
      {marketData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 Markedstendenser
          </h3>
          
          <div className="space-y-2">
            {marketData.trends.map((trend, index) => (
              <div key={index} className="flex items-center text-sm text-gray-700">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                {trend}
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Sidst opdateret: {marketData.lastUpdate}
          </div>
        </div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">🔧 Debug Info</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Profil alder: {profile.age || 'Ikke angivet'}</div>
            <div>Børn: {profile.children || 0}</div>
            <div>Proaktiv overvågning: {profile.dataConsent?.proactiveMonitoring ? 'Aktiv' : 'Inaktiv'}</div>
            <div>Antal alerts: {alerts.length}</div>
            <div>Ulæste alerts: {unreadAlerts.length}</div>
          </div>
        </div>
      )}
    </div>
  )
} 