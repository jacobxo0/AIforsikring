'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useUserProfileStore } from '@/lib/store/userProfileStore'
import { 
  TryghedsData, 
  TryghedsscoreDashboardProps,
  ProgressBarProps,
  SCORE_THRESHOLDS,
  DashboardError
} from '@/types/dashboard'
import { DashboardErrorBoundary, useErrorReporting } from '@/components/error/ErrorBoundary'
import { 
  LoadingButton, 
  TryghedsDashboardSkeleton,
  EmptyState,
  DelayedLoading 
} from '@/components/ui/LoadingStates'
import { ScreenReaderOnly, LiveRegion } from '@/components/ui/AccessibilityHelpers'
import { useTryghedsScore } from '@/lib/hooks/useTryghedsScore'

// Type guards and utilities for type safety

// Progress bar component with proper typing
const ProgressBar: React.FC<ProgressBarProps> = ({ 
  score, 
  max = 100, 
  size = 'md',
  showLabel = false,
  animated = true 
}) => {
  const width = Math.min(score, max);
  const percentage = (width / max) * 100;
  // Round to nearest 5 to match CSS classes
  const roundedPercentage = Math.round(percentage / 5) * 5;
  
  const colorClass = score >= SCORE_THRESHOLDS.excellent ? 'bg-green-500' :
                    score >= SCORE_THRESHOLDS.good ? 'bg-yellow-500' :
                    score >= SCORE_THRESHOLDS.fair ? 'bg-orange-500' : 'bg-red-500';
                    
  const heightClass = size === 'sm' ? 'h-1' : size === 'lg' ? 'h-4' : 'h-2';
  
  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full ${heightClass} mb-2`}>
        <div
          className={`${heightClass} rounded-full ${animated ? 'transition-all duration-300' : ''} ${colorClass} progress-bar`}
          data-width={roundedPercentage}
          title={`Score: ${score} ud af ${max}`}
        />
      </div>
      {showLabel && (
        <div className="text-sm text-gray-600 text-center">
          {score}/{max}
        </div>
      )}
    </div>
  );
};

const TryghedsscoreDashboard = memo(function TryghedsscoreDashboard({
  onScoreUpdate,
  onAnalysisComplete,
  className = ''
}: TryghedsscoreDashboardProps = {}) {
  const { profile, updateAnalysis } = useUserProfileStore()
  const { reportError } = useErrorReporting()
  const [showDetails, setShowDetails] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Use the new API hook instead of manual state management
  const {
    data: tryghedsData,
    isLoading: isAnalyzing,
    error,
    calculateScore,
    clearError
  } = useTryghedsScore({
    onSuccess: (data) => {
      onScoreUpdate?.(data.score)
      onAnalysisComplete?.(data)
      
      // Update profile with analysis
      updateAnalysis({
        date: new Date().toISOString(),
        tryghedsscore: data.score,
        mainRecommendations: data.improvement.slice(0, 3),
        criticalIssues: data.breakdown
          .filter((breakdown) => breakdown.score < 50)
          .map((breakdown) => `${breakdown.category}: ${breakdown.issues.join(', ')}`)
      })
    },
    onError: (error) => {
      reportError(new Error(error.message), 'TryghedsscoreDashboard.calculateScore')
    }
  })

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const runAnalysis = useCallback(async (): Promise<void> => {
    if (isAnalyzing) return // Prevent double execution
    
    clearError() // Clear previous errors
    
    // Use the new API hook to calculate score
    await calculateScore(profile, []) // TODO: Pass real policies when available
  }, [profile, isAnalyzing, calculateScore, clearError])

  // Load existing analysis data on mount if available
  useEffect(() => {
    if (profile.lastAnalysis && !tryghedsData) {
      // Trigger calculation with existing profile to populate dashboard
      runAnalysis()
    }
  }, [profile.lastAnalysis, tryghedsData, runAnalysis])

  // Memoize expensive calculations for performance optimization  
  const scoreMetrics = useMemo(() => {
    if (!tryghedsData) return null

    const score = tryghedsData.score
    
    const getScoreColor = (score: number) => {
      if (score >= SCORE_THRESHOLDS.excellent) return 'text-green-600'
      if (score >= SCORE_THRESHOLDS.good) return 'text-yellow-600'
      if (score >= SCORE_THRESHOLDS.fair) return 'text-orange-600'
      return 'text-red-600'
    }

    const getScoreIcon = (score: number) => {
      if (score >= SCORE_THRESHOLDS.excellent) return '🛡️'
      if (score >= SCORE_THRESHOLDS.good) return '⚠️'
      if (score >= SCORE_THRESHOLDS.fair) return '🚨'
      return '🔴'
    }

    const getScoreText = (score: number) => {
      if (score >= SCORE_THRESHOLDS.excellent) return 'Fremragende trygt'
      if (score >= SCORE_THRESHOLDS.good) return 'Godt beskyttet'
      if (score >= SCORE_THRESHOLDS.fair) return 'Moderat risiko'
      return 'Kritisk huller'
    }

    // Calculate best/worst categories
    const bestCategory = tryghedsData.breakdown.reduce((best, current) => 
      current.score > best.score ? current : best
    )
    
    const worstCategory = tryghedsData.breakdown.reduce((worst, current) => 
      current.score < worst.score ? current : worst
    )

    return {
      score,
      color: getScoreColor(score),
      icon: getScoreIcon(score),
      text: getScoreText(score),
      bestCategory: bestCategory.category,
      worstCategory: worstCategory.category,
      nextStep: tryghedsData.improvement[0] || 'Udfyld din profil',
      formattedTimestamp: new Date(tryghedsData.lastUpdated).toLocaleString('da-DK')
    }
  }, [tryghedsData])

  // Show loading skeleton on initial mount
  if (!mounted) {
    return (
      <DelayedLoading delay={100}>
        <TryghedsDashboardSkeleton />
      </DelayedLoading>
    )
  }

  // Error state
  if (error && !tryghedsData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <EmptyState
            icon="⚠️"
            title="Kunne ikke beregne tryghedsscore"
            description={error.message}
            action={
              <LoadingButton
                loading={isAnalyzing}
                onClick={runAnalysis}
                variant="primary"
              >
                🔄 Prøv igen
              </LoadingButton>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <DashboardErrorBoundary componentName="TryghedsscoreDashboard">
      <div className={`space-y-6 ${className}`} id="main-content">
        {/* Live region for status announcements */}
        <LiveRegion 
          message={
            isAnalyzing ? 'Beregner tryghedsscore' :
            error ? `Fejl: ${error.message}` :
            tryghedsData ? `Tryghedsscore opdateret: ${tryghedsData.score} point` :
            undefined
          } 
        />
        
        {/* Hovedscore */}
        <section 
          className="bg-white rounded-lg shadow-md p-6"
          aria-labelledby="tryghedsscore-heading"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="tryghedsscore-heading" className="text-2xl font-bold text-gray-900">
              🛡️ Din Tryghedsscore
              <ScreenReaderOnly>
                - Mål for hvor godt du er beskyttet af forsikringer
              </ScreenReaderOnly>
            </h2>
            <LoadingButton
              loading={isAnalyzing}
              onClick={runAnalysis}
              variant="primary"
              aria-label={isAnalyzing ? 'Beregner tryghedsscore' : 'Opdater tryghedsscore analyse'}
            >
              🔍 Opdater analyse
            </LoadingButton>
          </div>

        {tryghedsData ? (
          <div className="space-y-6">
            {/* Score Ring */}
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - tryghedsData.score / 100)}`}
                    className={scoreMetrics?.color || 'text-gray-600'}
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Score text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl mb-2">{scoreMetrics?.icon || '📊'}</div>
                  <div className={`text-3xl font-bold ${scoreMetrics?.color || 'text-gray-600'}`}>
                    {tryghedsData.score}
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    {scoreMetrics?.text || 'Beregner...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 font-semibold">📊 Bedste område</div>
                <div className="text-sm text-gray-700">
                  {scoreMetrics?.bestCategory || 'Ingen data'}
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-orange-600 font-semibold">⚡ Forbedringspotentiale</div>
                <div className="text-sm text-gray-700">
                  {scoreMetrics?.worstCategory || 'Ingen data'}
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 font-semibold">🎯 Næste skridt</div>
                <div className="text-sm text-gray-700">
                  {scoreMetrics?.nextStep || 'Udfyld din profil'}
                </div>
              </div>
            </div>

            {/* Detaljer toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-blue-600 hover:text-blue-800 font-medium"
            >
              {showDetails ? '▼ Skjul detaljer' : '▶ Se detaljeret analyse'}
            </button>

            {/* Detaljeret breakdown */}
            {showDetails && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">📋 Detaljeret analyse</h3>
                
                {tryghedsData.breakdown.map((category, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{category.category}</div>
                      <div className={`font-bold ${
                        category.score >= SCORE_THRESHOLDS.excellent ? 'text-green-600' :
                        category.score >= SCORE_THRESHOLDS.good ? 'text-yellow-600' :
                        category.score >= SCORE_THRESHOLDS.fair ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {category.score}/100
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <ProgressBar score={category.score} />
                    
                    {/* Issues */}
                    {category.issues.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Problemer: </span>
                        {category.issues.join(', ')}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-1">
                      Vægt i samlet score: {category.weight}%
                    </div>
                  </div>
                ))}

                {/* Improvement recommendations */}
                {tryghedsData.improvement.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Anbefalinger til forbedring</h4>
                    <ul className="space-y-1">
                      {tryghedsData.improvement.map((item, index) => (
                        <li key={index} className="text-sm text-blue-800 flex items-start">
                          <span className="mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Last updated */}
            <div className="text-xs text-gray-500 text-center">
              Sidst opdateret: {scoreMetrics?.formattedTimestamp || 'Ukendt'}
            </div>
          </div>
        ) : (
          <EmptyState
            icon="🔍"
            title="Ingen analyse endnu"
            description="Klik på 'Opdater analyse' for at få din personlige tryghedsscore. Vi analyserer dine forsikringer og giver dig en score baseret på din beskyttelse."
            action={
              <LoadingButton
                loading={isAnalyzing}
                onClick={runAnalysis}
                variant="primary"
              >
                🔍 Start analyse
              </LoadingButton>
            }
          />
        )}
        </section>
      </div>
    </DashboardErrorBoundary>
  )
})

// ✅ TASK 3 COMPLETED: Mock functions replaced with real API integration
// All calculation logic moved to /api/tryghedsscore/calculate/route.ts

export default TryghedsscoreDashboard 