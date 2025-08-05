/**
 * TypeScript definitions for Dashboard components
 * Created to eliminate 'any' types and improve type safety
 */

// We'll need to import UserProfile properly once it's exported from the store
// For now, we'll define a compatible interface
interface UserProfile {
  age?: number
  location?: string
  familyStatus?: 'single' | 'married' | 'divorced' | 'widowed'
  children?: number
  occupation?: string
  income?: number
  assets?: {
    home?: { 
      value: number
      type: 'owned' | 'rented'
      address?: string
      year?: number
    }
    vehicles?: Array<{ 
      type: string
      value: number
      year: number
      brand?: string
      model?: string
      licensePlate?: string
    }>
    valuables?: number
    otherAssets?: Array<{
      type: string
      value: number
      description: string
    }>
  }
  riskTolerance?: 'low' | 'medium' | 'high'
  onboardingCompleted?: boolean
  onboardingStep?: number
  lastAnalysis?: {
    date: string
    tryghedsscore: number
    mainRecommendations: string[]
    criticalIssues: string[]
  }
}

// Core scoring interfaces
export interface ScoreBreakdown {
  category: string
  score: number
  weight: number
  issues: string[]
  maxPossibleScore?: number
  improvements?: string[]
}

export interface TryghedsData {
  score: number
  breakdown: ScoreBreakdown[]
  improvement: string[]
  lastUpdated: string
  confidence?: number
  marketComparison?: {
    percentile: number
    averageScore: number
  }
}

// Calculation input types
export interface ScoreCalculationInput {
  profile: UserProfile
  policies?: InsurancePolicy[]
  marketData?: MarketData
  riskFactors?: RiskFactor[]
}

export interface InsurancePolicy {
  id: string
  type: 'life' | 'home' | 'car' | 'health' | 'liability' | 'pension'
  provider: string
  premium_amount: number
  coverage_amount: number
  start_date: string
  end_date?: string
  coverage_details: Record<string, unknown>
  status: 'active' | 'expired' | 'cancelled' | 'pending'
}

export interface MarketData {
  averagePremiums: Record<string, number>
  coverageStandards: Record<string, number>
  riskAssessments: Record<string, number>
  lastUpdated: string
}

export interface RiskFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendation?: string
}

// Dashboard metrics
export interface DashboardMetrics {
  totalPolicies: number
  totalPremium: number
  totalCoverage: number
  upcomingRenewals: number
  riskScore: number
  recommendations: string[]
  lastCalculated: string
}

// UI State types
export interface DashboardUIState {
  activeTab: 'overview' | 'tryghed' | 'profile'
  showDetails: boolean
  isAnalyzing: boolean
  mounted: boolean
}

// Component prop types
export interface TryghedsscoreDashboardProps {
  onScoreUpdate?: (score: number) => void
  onAnalysisComplete?: (data: TryghedsData) => void
  className?: string
}

export interface ProgressBarProps {
  score: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
}

export interface MetricCardProps {
  title: string
  value: string | number
  icon: string
  subtitle: string
  alert?: boolean
  trend?: 'up' | 'down' | 'stable'
  onClick?: () => void
}

// Error types
export interface DashboardError {
  type: 'calculation' | 'api' | 'validation' | 'network'
  message: string
  code?: string
  timestamp: string
  retryable: boolean
}

// API response types
export interface TryghedsscoreApiResponse {
  success: boolean
  data?: TryghedsData
  error?: DashboardError
  metadata?: {
    calculationTime: number
    version: string
    cached: boolean
  }
}

export interface ScoreHistoryEntry {
  date: string
  score: number
  factors: string[]
  profileSnapshot: Partial<UserProfile>
}

// Utility types
export type ScoreCategory = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
export type ScoreColorScheme = 'green' | 'yellow' | 'orange' | 'red'

// Constants
export const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
  poor: 20
} as const

export const CATEGORY_WEIGHTS = {
  livsforsikring: 0.25,
  indboforsikring: 0.20,
  bilforsikring: 0.15,
  ansvarsforsikring: 0.15,
  sundhedsforsikring: 0.15,
  pensionsforsikring: 0.10
} as const

// Type guards
export function isTryghedsData(obj: unknown): obj is TryghedsData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as TryghedsData).score === 'number' &&
    Array.isArray((obj as TryghedsData).breakdown) &&
    Array.isArray((obj as TryghedsData).improvement) &&
    typeof (obj as TryghedsData).lastUpdated === 'string'
  )
}

export function isScoreBreakdown(obj: unknown): obj is ScoreBreakdown {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ScoreBreakdown).category === 'string' &&
    typeof (obj as ScoreBreakdown).score === 'number' &&
    typeof (obj as ScoreBreakdown).weight === 'number' &&
    Array.isArray((obj as ScoreBreakdown).issues)
  )
} 