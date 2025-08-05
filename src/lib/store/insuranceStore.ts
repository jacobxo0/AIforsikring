import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  UserProfile,
  Document,
  Conversation,
  ChatMessage,
  UserPolicy,
  Claim,
  AIInsight
} from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  [key: string]: unknown
}

interface UserData {
  user: User
  profile?: UserProfile
  documents?: Document[]
  conversations?: Conversation[]
  policies?: UserPolicy[]
  claims?: Claim[]
  insights?: AIInsight[]
}

interface InsuranceState {
  // User data
  user: User | null
  profile: UserProfile | null

  // Documents
  documents: Document[]
  selectedDocument: Document | null

  // Conversations
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: ChatMessage[]

  // Policies and claims
  policies: UserPolicy[]
  claims: Claim[]

  // AI insights
  insights: AIInsight[]

  // UI state
  isLoading: boolean
  isChatLoading: boolean
  error: string | null

  // Settings
  settings: {
    theme: 'light' | 'dark'
    language: 'da' | 'en'
    notifications: {
      email: boolean
      push: boolean
      reminders: boolean
    }
    privacy: {
      chatHistory: boolean
      documentStorage: boolean
      aiTraining: boolean
      analytics: boolean
      marketing: boolean
    }
  }

  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile) => void
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  removeDocument: (documentId: string) => void
  selectDocument: (document: Document | null) => void

  setConversations: (conversations: Conversation[]) => void
  setCurrentConversation: (conversation: Conversation | null) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void

  setPolicies: (policies: UserPolicy[]) => void
  addPolicy: (policy: UserPolicy) => void
  updatePolicy: (policyId: string, updates: Partial<UserPolicy>) => void

  setClaims: (claims: Claim[]) => void
  addClaim: (claim: Claim) => void
  updateClaim: (claimId: string, updates: Partial<Claim>) => void

  setInsights: (insights: AIInsight[]) => void
  addInsight: (insight: AIInsight) => void
  acknowledgeInsight: (insightId: string) => void

  setLoading: (isLoading: boolean) => void
  setChatLoading: (isChatLoading: boolean) => void
  setError: (error: string | null) => void

  updateSettings: (settings: Partial<InsuranceState['settings']>) => void
  updatePrivacySettings: (privacy: Partial<InsuranceState['settings']['privacy']>) => void

  // Complex actions
  initializeUser: (userData: UserData) => void
  clearUserData: () => void
  getDocumentsByType: (type: string) => Document[]
  getPoliciesByStatus: (status: string) => UserPolicy[]
  getUnacknowledgedInsights: () => AIInsight[]
  getTotalCoverage: () => number
  getTotalPremiums: () => number
}

export const useInsuranceStore = create<InsuranceState>()(
  persist(
    (set, get) => ({
      // Initial state
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
        theme: 'light',
        language: 'da',
        notifications: {
          email: true,
          push: true,
          reminders: true
        },
        privacy: {
          chatHistory: false,
          documentStorage: false,
          aiTraining: false,
          analytics: false,
          marketing: false
        }
      },

      // Basic setters
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),

      // Document actions
      setDocuments: (documents) => set({ documents }),
      addDocument: (document) => set((state) => ({
        documents: [document, ...state.documents]
      })),
      removeDocument: (documentId) => set((state) => ({
        documents: state.documents.filter(doc => doc.id !== documentId),
        selectedDocument: state.selectedDocument?.id === documentId ? null : state.selectedDocument
      })),
      selectDocument: (document) => set({ selectedDocument: document }),

      // Conversation actions
      setConversations: (conversations) => set({ conversations }),
      setCurrentConversation: (conversation) => set({
        currentConversation: conversation,
        messages: [] // Clear messages when switching conversations
      }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),
      updateMessage: (messageId, updates) => set((state) => ({
        messages: state.messages.map(msg =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      })),

      // Policy actions
      setPolicies: (policies) => set({ policies }),
      addPolicy: (policy) => set((state) => ({
        policies: [policy, ...state.policies]
      })),
      updatePolicy: (policyId, updates) => set((state) => ({
        policies: state.policies.map(policy =>
          policy.id === policyId ? { ...policy, ...updates } : policy
        )
      })),

      // Claim actions
      setClaims: (claims) => set({ claims }),
      addClaim: (claim) => set((state) => ({
        claims: [claim, ...state.claims]
      })),
      updateClaim: (claimId, updates) => set((state) => ({
        claims: state.claims.map(claim =>
          claim.id === claimId ? { ...claim, ...updates } : claim
        )
      })),

      // Insight actions
      setInsights: (insights) => set({ insights }),
      addInsight: (insight) => set((state) => ({
        insights: [insight, ...state.insights]
      })),
      acknowledgeInsight: (insightId) => set((state) => ({
        insights: state.insights.map(insight =>
          insight.id === insightId
            ? { ...insight, is_acknowledged: true, acknowledged_at: new Date().toISOString() }
            : insight
        )
      })),

      // UI state actions
      setLoading: (isLoading) => set({ isLoading }),
      setChatLoading: (isChatLoading) => set({ isChatLoading }),
      setError: (error) => set({ error }),

      // Settings actions
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      updatePrivacySettings: (privacy) => set((state) => ({
        settings: {
          ...state.settings,
          privacy: { ...state.settings.privacy, ...privacy }
        }
      })),

      // Complex actions
      initializeUser: (userData) => set({
        user: userData.user,
        profile: userData.profile || null,
        documents: userData.documents || [],
        conversations: userData.conversations || [],
        policies: userData.policies || [],
        claims: userData.claims || [],
        insights: userData.insights || [],
        error: null
      }),

      clearUserData: () => set({
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
        error: null
      }),

      // Computed values
      getDocumentsByType: (type) => {
        const state = get()
        return state.documents.filter(doc => doc.document_type === type)
      },

      getPoliciesByStatus: (status) => {
        const state = get()
        return state.policies.filter(policy => policy.status === status)
      },

      getUnacknowledgedInsights: () => {
        const state = get()
        return state.insights.filter(insight => !insight.is_acknowledged)
      },

      getTotalCoverage: () => {
        const state = get()
        return state.policies
          .filter(policy => policy.status === 'active' && policy.coverage_details)
          .reduce((total, policy) => {
            const coverageDetails = policy.coverage_details as Record<string, unknown>
            const amount = coverageDetails?.amount as number || 0
            return total + amount
          }, 0)
      },

      getTotalPremiums: () => {
        const state = get()
        return state.policies
          .filter(policy => policy.status === 'active' && policy.premium_amount)
          .reduce((total, policy) => total + (policy.premium_amount || 0), 0)
      }
    }),
    {
      name: 'insurance-store',
      storage: createJSONStorage(() => {
        // Only persist certain parts of the state
        return {
          getItem: (name) => {
            const value = localStorage.getItem(name)
            return value ? JSON.parse(value) : null
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value))
          },
          removeItem: (name) => {
            localStorage.removeItem(name)
          }
        }
      }),
      partialize: (state) => ({
        // Only persist settings and non-sensitive data
        settings: state.settings,
        selectedDocument: state.selectedDocument?.id ? { id: state.selectedDocument.id } : null,
        currentConversation: state.currentConversation?.id ? { id: state.currentConversation.id } : null
      })
    }
  )
)

// Selectors for better performance
export const useUser = () => useInsuranceStore((state) => state.user)
export const useProfile = () => useInsuranceStore((state) => state.profile)
export const useDocuments = () => useInsuranceStore((state) => state.documents)
export const useSelectedDocument = () => useInsuranceStore((state) => state.selectedDocument)
export const useConversations = () => useInsuranceStore((state) => state.conversations)
export const useCurrentConversation = () => useInsuranceStore((state) => state.currentConversation)
export const useMessages = () => useInsuranceStore((state) => state.messages)
export const usePolicies = () => useInsuranceStore((state) => state.policies)
export const useClaims = () => useInsuranceStore((state) => state.claims)
export const useInsights = () => useInsuranceStore((state) => state.insights)
export const useIsLoading = () => useInsuranceStore((state) => state.isLoading)
export const useIsChatLoading = () => useInsuranceStore((state) => state.isChatLoading)
export const useError = () => useInsuranceStore((state) => state.error)
export const useSettings = () => useInsuranceStore((state) => state.settings)

// Complex selectors
export const useActivePolicies = () => useInsuranceStore((state) =>
  state.policies.filter(policy => policy.status === 'active')
)

export const useUnacknowledgedInsights = () => useInsuranceStore((state) =>
  state.insights.filter(insight => !insight.is_acknowledged)
)

export const useDocumentsByType = (type: string) => useInsuranceStore((state) =>
  state.documents.filter(doc => doc.document_type === type)
)

export const useTotalCoverage = () => useInsuranceStore((state) =>
  state.policies
    .filter(policy => policy.status === 'active' && policy.coverage_details)
    .reduce((total, policy) => {
      const coverageDetails = policy.coverage_details as Record<string, unknown>
      const amount = coverageDetails?.amount as number || 0
      return total + amount
    }, 0)
)

export const useTotalPremiums = () => useInsuranceStore((state) =>
  state.policies
    .filter(policy => policy.status === 'active' && policy.premium_amount)
    .reduce((total, policy) => total + (policy.premium_amount || 0), 0)
)