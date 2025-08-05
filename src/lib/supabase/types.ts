export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          date_of_birth: string | null
          address: Json | null
          preferences: Json
          risk_profile: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          date_of_birth?: string | null
          address?: Json | null
          preferences?: Json
          risk_profile?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          date_of_birth?: string | null
          address?: Json | null
          preferences?: Json
          risk_profile?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          metadata: Json
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          metadata?: Json
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          metadata?: Json
          expires_at?: string
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          content_type: string
          document_type: 'insurance_policy' | 'claim_document' | 'correspondence' | 'general_document' | 'legal_document'
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          extracted_text: string | null
          metadata: Json
          is_active: boolean
          uploaded_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          content_type: string
          document_type: 'insurance_policy' | 'claim_document' | 'correspondence' | 'general_document' | 'legal_document'
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          extracted_text?: string | null
          metadata?: Json
          is_active?: boolean
          uploaded_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_path?: string
          file_size?: number
          content_type?: string
          document_type?: 'insurance_policy' | 'claim_document' | 'correspondence' | 'general_document' | 'legal_document'
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          extracted_text?: string | null
          metadata?: Json
          is_active?: boolean
          uploaded_at?: string
          processed_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          summary: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          summary?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          summary?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json
          timestamp: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          timestamp?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json
          timestamp?: string
        }
      }
      legal_references: {
        Row: {
          id: string
          law_name: string
          section: string
          paragraph: string | null
          content: string
          summary: string | null
          category: string
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          law_name: string
          section: string
          paragraph?: string | null
          content: string
          summary?: string | null
          category: string
          last_updated: string
          created_at?: string
        }
        Update: {
          id?: string
          law_name?: string
          section?: string
          paragraph?: string | null
          content?: string
          summary?: string | null
          category?: string
          last_updated?: string
          created_at?: string
        }
      }
      insurance_companies: {
        Row: {
          id: string
          name: string
          website: string | null
          contact_info: Json
          rating: number | null
          specialties: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          website?: string | null
          contact_info?: Json
          rating?: number | null
          specialties?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          website?: string | null
          contact_info?: Json
          rating?: number | null
          specialties?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      insurance_products: {
        Row: {
          id: string
          company_id: string
          product_name: string
          product_type: string
          coverage_details: Json
          pricing_model: Json
          eligibility_criteria: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          product_name: string
          product_type: string
          coverage_details?: Json
          pricing_model?: Json
          eligibility_criteria?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          product_name?: string
          product_type?: string
          coverage_details?: Json
          pricing_model?: Json
          eligibility_criteria?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_policies: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          policy_number: string
          policy_type: string
          coverage_details: Json
          premium_amount: number | null
          deductible_amount: number | null
          start_date: string
          end_date: string | null
          status: 'active' | 'expired' | 'cancelled' | 'pending'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          policy_number: string
          policy_type: string
          coverage_details?: Json
          premium_amount?: number | null
          deductible_amount?: number | null
          start_date: string
          end_date?: string | null
          status?: 'active' | 'expired' | 'cancelled' | 'pending'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string | null
          policy_number?: string
          policy_type?: string
          coverage_details?: Json
          premium_amount?: number | null
          deductible_amount?: number | null
          start_date?: string
          end_date?: string | null
          status?: 'active' | 'expired' | 'cancelled' | 'pending'
          created_at?: string
          updated_at?: string
        }
      }
      claims: {
        Row: {
          id: string
          user_id: string
          policy_id: string | null
          claim_number: string
          incident_date: string
          reported_date: string
          claim_type: string
          description: string
          amount_claimed: number | null
          amount_settled: number | null
          status: 'submitted' | 'under_review' | 'approved' | 'denied' | 'settled' | 'closed'
          supporting_documents: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          policy_id?: string | null
          claim_number: string
          incident_date: string
          reported_date: string
          claim_type: string
          description: string
          amount_claimed?: number | null
          amount_settled?: number | null
          status?: 'submitted' | 'under_review' | 'approved' | 'denied' | 'settled' | 'closed'
          supporting_documents?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          policy_id?: string | null
          claim_number?: string
          incident_date?: string
          reported_date?: string
          claim_type?: string
          description?: string
          amount_claimed?: number | null
          amount_settled?: number | null
          status?: 'submitted' | 'under_review' | 'approved' | 'denied' | 'settled' | 'closed'
          supporting_documents?: Json
          created_at?: string
          updated_at?: string
        }
      }
      ai_insights: {
        Row: {
          id: string
          user_id: string
          insight_type: string
          title: string
          description: string
          priority: 'low' | 'medium' | 'high' | 'urgent'
          recommended_actions: Json
          confidence_score: number
          data_sources: Json
          is_acknowledged: boolean
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          insight_type: string
          title: string
          description: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          recommended_actions?: Json
          confidence_score?: number
          data_sources?: Json
          is_acknowledged?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          insight_type?: string
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          recommended_actions?: Json
          confidence_score?: number
          data_sources?: Json
          is_acknowledged?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          feedback_type: 'rating' | 'comment' | 'bug_report' | 'feature_request'
          content: string
          rating: number | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feedback_type: 'rating' | 'comment' | 'bug_report' | 'feature_request'
          content: string
          rating?: number | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feedback_type?: 'rating' | 'comment' | 'bug_report' | 'feature_request'
          content?: string
          rating?: number | null
          metadata?: Json
          created_at?: string
        }
      }
      user_consents: {
        Row: {
          id: string
          user_id: string
          consent_type: 'data_processing' | 'marketing' | 'analytics' | 'document_storage' | 'ai_training'
          granted: boolean
          granted_at: string | null
          revoked_at: string | null
          legal_basis: string
          purposes: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          consent_type: 'data_processing' | 'marketing' | 'analytics' | 'document_storage' | 'ai_training'
          granted: boolean
          granted_at?: string | null
          revoked_at?: string | null
          legal_basis: string
          purposes?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          consent_type?: 'data_processing' | 'marketing' | 'analytics' | 'document_storage' | 'ai_training'
          granted?: boolean
          granted_at?: string | null
          revoked_at?: string | null
          legal_basis?: string
          purposes?: Json
          created_at?: string
          updated_at?: string
        }
      }
      system_analytics: {
        Row: {
          id: string
          event_type: string
          event_data: Json
          user_id: string | null
          session_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          event_data: Json
          user_id?: string | null
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          event_data?: Json
          user_id?: string | null
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      market_data: {
        Row: {
          id: string
          data_type: string
          data_value: Json
          source: string
          collection_date: string
          created_at: string
        }
        Insert: {
          id?: string
          data_type: string
          data_value: Json
          source: string
          collection_date: string
          created_at?: string
        }
        Update: {
          id?: string
          data_type?: string
          data_value?: Json
          source?: string
          collection_date?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 