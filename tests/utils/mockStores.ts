/**
 * Mock Store Utilities for Testing
 * TASK 4.3: Mock Zustand stores til testing
 */

import { act } from '@testing-library/react'

// Mock UserProfileStore
export const createMockUserProfileStore = (overrides = {}) => {
  const defaultStore = {
    profile: {
      age: 30,
      location: '2100',
      familyStatus: 'single' as const,
      children: 0,
      occupation: 'Developer',
      income: 500000,
      assets: undefined,
      onboardingCompleted: true,
      onboardingStep: 100,
      lastAnalysis: undefined
    },
    isLoading: false,
    updateProfile: jest.fn(),
    updateAssets: jest.fn(),
    updatePreferences: jest.fn(),
    addLifeEvent: jest.fn(),
    markLifeEventHandled: jest.fn(),
    getUnhandledLifeEvents: jest.fn(() => []),
    completeOnboardingStep: jest.fn(),
    completeOnboarding: jest.fn(),
    updateAnalysis: jest.fn(),
    updateConsent: jest.fn(),
    getCompletionPercentage: jest.fn(() => 80),
    getMissingCriticalInfo: jest.fn(() => []),
    clearProfile: jest.fn()
  }

  return {
    ...defaultStore,
    ...overrides
  }
}

// Mock InsuranceStore
export const createMockInsuranceStore = (overrides = {}) => {
  const defaultStore = {
    user: null,
    profile: null,
    documents: [],
    selectedDocument: null,
    conversations: [],
    currentConversation: null,
    messages: [],
    policies: [],
    claims: [],
    insights: [],
    isLoading: false,
    isChatLoading: false,
    error: null,
    settings: {
      theme: 'light' as const,
      language: 'da' as const,
      notifications: {
        email: true,
        push: true,
        reminders: true
      },
      privacy: {
        chatHistory: true,
        documentStorage: true,
        aiTraining: false,
        analytics: true,
        marketing: false
      }
    },
    
    // Actions
    setUser: jest.fn(),
    setProfile: jest.fn(),
    setDocuments: jest.fn(),
    addDocument: jest.fn(),
    removeDocument: jest.fn(),
    selectDocument: jest.fn(),
    setConversations: jest.fn(),
    setCurrentConversation: jest.fn(),
    setMessages: jest.fn(),
    addMessage: jest.fn(),
    updateMessage: jest.fn(),
    setPolicies: jest.fn(),
    addPolicy: jest.fn(),
    updatePolicy: jest.fn(),
    setClaims: jest.fn(),
    addClaim: jest.fn(),
    updateClaim: jest.fn(),
    setInsights: jest.fn(),
    addInsight: jest.fn(),
    acknowledgeInsight: jest.fn(),
    setLoading: jest.fn(),
    setChatLoading: jest.fn()
  }

  return {
    ...defaultStore,
    ...overrides
  }
}

// Test helper for creating mock profiles with different scenarios
export const createTestProfile = (scenario: 'single' | 'married' | 'family' | 'senior' | 'minimal') => {
  const baseProfile = {
    onboardingCompleted: true,
    onboardingStep: 100
  }

  switch (scenario) {
    case 'single':
      return {
        ...baseProfile,
        age: 28,
        location: '2100',
        familyStatus: 'single' as const,
        children: 0,
        occupation: 'Software Developer',
        income: 550000,
        assets: {
          home: {
            value: 2500000,
            type: 'owned' as const
          }
        }
      }
      
    case 'married':
      return {
        ...baseProfile,
        age: 35,
        location: '2000',
        familyStatus: 'married' as const,
        children: 0,
        occupation: 'Manager',
        income: 750000,
        assets: {
          home: {
            value: 4000000,
            type: 'owned' as const
          },
          vehicles: [{
            type: 'Car',
            value: 350000,
            year: 2020,
            brand: 'Toyota',
            model: 'Camry'
          }]
        }
      }
      
    case 'family':
      return {
        ...baseProfile,
        age: 40,
        location: '2800',
        familyStatus: 'married' as const,
        children: 2,
        occupation: 'Engineer',
        income: 850000,
        assets: {
          home: {
            value: 5500000,
            type: 'owned' as const
          },
          vehicles: [{
            type: 'SUV',
            value: 450000,
            year: 2021,
            brand: 'Volvo',
            model: 'XC90'
          }],
          valuables: 200000
        }
      }
      
    case 'senior':
      return {
        ...baseProfile,
        age: 65,
        location: '8000',
        familyStatus: 'widowed' as const,
        children: 3,
        occupation: 'Retired',
        income: 300000,
        assets: {
          home: {
            value: 3000000,
            type: 'owned' as const
          }
        }
      }
      
    case 'minimal':
      return {
        age: 25,
        onboardingCompleted: false,
        onboardingStep: 1
      }
      
    default:
      return baseProfile
  }
}

// Test helper for creating mock policies
export const createTestPolicies = (types: ('life' | 'home' | 'car' | 'health' | 'liability' | 'pension')[]) => {
  return types.map(type => ({
    id: `test-${type}-policy`,
    type,
    provider: `Test ${type.charAt(0).toUpperCase() + type.slice(1)} Provider`,
    premium_amount: type === 'car' ? 8000 : type === 'home' ? 3500 : 2000,
    coverage_amount: type === 'life' ? 2000000 : type === 'home' ? 1500000 : 500000,
    start_date: '2024-01-01T00:00:00Z',
    end_date: '2024-12-31T23:59:59Z',
    coverage_details: {},
    status: 'active' as const
  }))
}

// Test helper for creating mock tryghedscore data
export const createMockTryghedsData = (score: number = 75, overrides = {}) => ({
  score,
  breakdown: [
    {
      category: 'Livsforsikring',
      score: score - 15,
      weight: 25,
      issues: score < 70 ? ['Mangler tilstrækkelig dækning'] : [],
      improvements: ['Tjek dækning']
    },
    {
      category: 'Indboforsikring', 
      score: score + 10,
      weight: 20,
      issues: [],
      improvements: []
    },
    {
      category: 'Bilforsikring',
      score: score,
      weight: 15,
      issues: [],
      improvements: []
    }
  ],
  improvement: [
    'Upload dine eksisterende policer',
    'Sammenlign markedspriser årligt'
  ],
  lastUpdated: new Date().toISOString(),
  confidence: 0.85,
  ...overrides
})

// Async test helpers
export const waitForStoreUpdate = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

export const mockStoreImplementation = (mockFn: jest.MockedFunction<any>, returnValue: any) => {
  mockFn.mockImplementation(() => returnValue)
}

// Reset all mocks utility
export const resetAllMocks = () => {
  jest.clearAllMocks()
}

export default {
  createMockUserProfileStore,
  createMockInsuranceStore,
  createTestProfile,
  createTestPolicies,
  createMockTryghedsData,
  waitForStoreUpdate,
  mockStoreImplementation,
  resetAllMocks
} 