'use client'

import InsightsDashboard from '@/components/dashboard/InsightsDashboard'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            📊 Forsikringsdashboard
          </h1>
          <InsightsDashboard />
        </div>
      </div>
    </div>
  )
} 