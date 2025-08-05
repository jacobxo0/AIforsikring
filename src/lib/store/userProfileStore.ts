import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserProfile {
  // Basic Info
  age?: number
  location?: string
  familyStatus?: 'single' | 'married' | 'divorced' | 'widowed'
  children?: number
  occupation?: string
  income?: number
  
  // Assets
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
  
  // Preferences
  riskTolerance?: 'low' | 'medium' | 'high'
  communicationPreferences?: {
    email: boolean
    sms: boolean
    push: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
  }
  
  // Life Events
  lifeEvents?: Array<{
    id: string
    type: 'birth' | 'marriage' | 'divorce' | 'job_change' | 'move' | 'retirement' | 'death' | 'illness' | 'purchase'
    date: string
    details?: string
    impactOnInsurance?: string
    handled: boolean
  }>
  
  // AI Insights
  lastAnalysis?: {
    date: string
    tryghedsscore: number
    mainRecommendations: string[]
    criticalIssues: string[]
  }
  
  // Onboarding
  onboardingCompleted?: boolean
  onboardingStep?: number
  
  // Data consent
  dataConsent?: {
    analytics: boolean
    marketing: boolean
    thirdParty: boolean
    proactiveMonitoring: boolean
    lastUpdated: string
  }
}

interface UserProfileState {
  profile: UserProfile
  isLoading: boolean
  
  // Profile Management
  updateProfile: (updates: Partial<UserProfile>) => void
  updateAssets: (assets: UserProfile['assets']) => void
  updatePreferences: (prefs: Partial<UserProfile>) => void
  
  // Life Events
  addLifeEvent: (event: Omit<NonNullable<UserProfile['lifeEvents']>[0], 'id'>) => void
  markLifeEventHandled: (eventId: string) => void
  getUnhandledLifeEvents: () => UserProfile['lifeEvents']
  
  // Onboarding
  completeOnboardingStep: (step: number) => void
  completeOnboarding: () => void
  
  // AI Analysis
  updateAnalysis: (analysis: UserProfile['lastAnalysis']) => void
  
  // Consent Management
  updateConsent: (consent: Partial<UserProfile['dataConsent']>) => void
  
  // Utilities
  getCompletionPercentage: () => number
  getMissingCriticalInfo: () => string[]
  
  // Reset
  clearProfile: () => void
}

const initialProfile: UserProfile = {
  onboardingCompleted: false,
  onboardingStep: 0,
  dataConsent: {
    analytics: false,
    marketing: false,
    thirdParty: false,
    proactiveMonitoring: false,
    lastUpdated: new Date().toISOString()
  },
  communicationPreferences: {
    email: true,
    sms: false,
    push: true,
    frequency: 'weekly'
  },
  lifeEvents: []
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profile: initialProfile,
      isLoading: false,

      updateProfile: (updates) => {
        set(state => ({
          profile: { ...state.profile, ...updates }
        }))
      },

      updateAssets: (assets) => {
        set(state => ({
          profile: { 
            ...state.profile, 
            assets: { ...state.profile.assets, ...assets }
          }
        }))
      },

      updatePreferences: (prefs) => {
        set(state => ({
          profile: { ...state.profile, ...prefs }
        }))
      },

      addLifeEvent: (event) => {
        const newEvent = {
          ...event,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? 
            crypto.randomUUID() : 
            `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          handled: false
        }
        
        set(state => ({
          profile: {
            ...state.profile,
            lifeEvents: [...(state.profile.lifeEvents || []), newEvent]
          }
        }))
      },

      markLifeEventHandled: (eventId) => {
        set(state => ({
          profile: {
            ...state.profile,
            lifeEvents: state.profile.lifeEvents?.map(event =>
              event.id === eventId ? { ...event, handled: true } : event
            )
          }
        }))
      },

      getUnhandledLifeEvents: () => {
        const { profile } = get()
        return profile.lifeEvents?.filter(event => !event.handled) || []
      },

      completeOnboardingStep: (step) => {
        set(state => ({
          profile: {
            ...state.profile,
            onboardingStep: Math.max(state.profile.onboardingStep || 0, step)
          }
        }))
      },

      completeOnboarding: () => {
        set(state => ({
          profile: {
            ...state.profile,
            onboardingCompleted: true,
            onboardingStep: 100
          }
        }))
      },

      updateAnalysis: (analysis) => {
        set(state => ({
          profile: {
            ...state.profile,
            lastAnalysis: analysis
          }
        }))
      },

      updateConsent: (consent) => {
        set(state => ({
          profile: {
            ...state.profile,
            dataConsent: {
              analytics: false,
              marketing: false,
              thirdParty: false,
              proactiveMonitoring: false,
              ...state.profile.dataConsent,
              ...consent,
              lastUpdated: new Date().toISOString()
            }
          }
        }))
      },

      getCompletionPercentage: () => {
        const { profile } = get()
        const fields = [
          'age', 'location', 'familyStatus', 'occupation', 'income'
        ]
        
        const completed = fields.filter(field => 
          profile[field as keyof UserProfile] !== undefined && 
          profile[field as keyof UserProfile] !== null
        ).length
        
        return Math.round((completed / fields.length) * 100)
      },

      getMissingCriticalInfo: () => {
        const { profile } = get()
        const missing: string[] = []
        
        if (!profile.age) missing.push('Alder')
        if (!profile.location) missing.push('Bopæl')
        if (!profile.familyStatus) missing.push('Familiestand')
        if (!profile.occupation) missing.push('Erhverv')
        if (!profile.income) missing.push('Indkomst')
        
        return missing
      },

      clearProfile: () => {
        set({ profile: initialProfile })
      }
    }),
    {
      name: 'user-profile-storage',
      partialize: (state) => ({ 
        profile: state.profile 
      })
    }
  )
) 