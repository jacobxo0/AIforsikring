'use client'

import React from 'react'

interface UsageIndicatorProps {
  current: number
  limit: number
  type: 'documents' | 'reports' | 'chats'
  showUpgrade?: boolean
}

export default function UsageIndicator({ current, limit, type, showUpgrade = true }: UsageIndicatorProps) {
  const percentage = Math.min((current / limit) * 100, 100)
  const isAtLimit = current >= limit
  const isNearLimit = current >= limit * 0.8

  const getIcon = () => {
    switch (type) {
      case 'documents': return '📄'
      case 'reports': return '📊'
      case 'chats': return '💬'
      default: return '📈'
    }
  }

  const getLabel = () => {
    switch (type) {
      case 'documents': return 'Dokumenter'
      case 'reports': return 'Rapporter'
      case 'chats': return 'Chat beskeder'
      default: return 'Forbrug'
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getIcon()}</span>
          <span className="font-medium text-gray-900">{getLabel()}</span>
        </div>
        <span className="text-sm text-gray-500">
          {current} / {limit === Infinity ? '∞' : limit}
        </span>
      </div>

      {limit !== Infinity && (
        <div className="mb-2">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className={`rounded-full h-2 transition-all duration-300 ${
                isAtLimit 
                  ? 'bg-red-500' 
                  : isNearLimit 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {isAtLimit && showUpgrade && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-700 mb-2">
            Du har nået grænsen for gratis brugere
          </p>
          <button 
            onClick={() => window.location.href = '/upgrade'}
            className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Upgrade nu
          </button>
        </div>
      )}

      {isNearLimit && !isAtLimit && showUpgrade && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-700">
            Du er tæt på grænsen for gratis brugere
          </p>
        </div>
      )}
    </div>
  )
}