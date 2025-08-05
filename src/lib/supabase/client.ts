import { createBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr'
import type { Database } from './types'

// Get Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const createClient = () => createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client
interface CookieStore {
  get(name: string): { value: string } | undefined
  set(options: { name: string; value: string; [key: string]: unknown }): void
}

export const createServerClient = (cookieStore: CookieStore) =>
  createSSRServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

// Database types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types
export type UserProfile = Tables<'user_profiles'>
export type Document = Tables<'documents'>
export type Conversation = Tables<'conversations'>
export type ChatMessage = Tables<'chat_messages'>
export type UserPolicy = Tables<'user_policies'>
export type Claim = Tables<'claims'>
export type AIInsight = Tables<'ai_insights'>
export type Feedback = Tables<'feedback'>
export type UserConsent = Tables<'user_consents'>
export type LegalReference = Tables<'legal_references'>
export type InsuranceCompany = Tables<'insurance_companies'>
export type InsuranceProduct = Tables<'insurance_products'>
export type MarketData = Tables<'market_data'>

// Enums
export type DocumentType = 'insurance_policy' | 'claim_document' | 'correspondence' | 'general_document' | 'legal_document'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type MessageRole = 'user' | 'assistant' | 'system'
export type PolicyStatus = 'active' | 'expired' | 'cancelled' | 'pending'
export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'denied' | 'settled' | 'closed'
export type InsightPriority = 'low' | 'medium' | 'high' | 'urgent'
export type FeedbackType = 'rating' | 'comment' | 'bug_report' | 'feature_request'
export type ConsentType = 'data_processing' | 'marketing' | 'analytics' | 'document_storage' | 'ai_training'

// Helper functions
export const supabaseErrorHandler = (error: unknown) => {
  console.error('Supabase error:', error)

  // Type guard for error objects
  const isErrorWithCode = (err: unknown): err is { code: string; message?: string } => {
    return err !== null && typeof err === 'object' && 'code' in err
  }

  if (isErrorWithCode(error)) {
    if (error.code === 'PGRST116') {
      return { error: 'Record not found', code: 404 }
    }

    if (error.code === '23505') {
      return { error: 'Record already exists', code: 409 }
    }

    if (error.code === '42501') {
      return { error: 'Insufficient permissions', code: 403 }
    }

    return { error: error.message || 'Database error', code: 500 }
  }

  return { error: 'Unknown database error', code: 500 }
}