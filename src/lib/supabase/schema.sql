-- AI Forsikringsguiden Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  address JSONB, -- {street, city, postal_code, country}
  preferences JSONB DEFAULT '{}', -- UI preferences, communication style, etc.
  risk_profile JSONB DEFAULT '{}', -- Calculated risk factors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions for tracking
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}', -- Browser info, device, etc.
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents uploaded by users
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  content TEXT, -- Extracted text content
  content_vector vector(1536), -- OpenAI embeddings for semantic search
  document_type TEXT CHECK (document_type IN ('insurance_policy', 'claim_document', 'correspondence', 'general_document', 'legal_document')) NOT NULL,
  classification_confidence REAL DEFAULT 0.0,
  metadata JSONB DEFAULT '{}', -- Extracted entities, dates, amounts, etc.
  processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  storage_path TEXT, -- Supabase Storage path
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated or user-defined
  summary TEXT, -- AI-generated conversation summary
  total_messages INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  content_vector vector(1536), -- For semantic search
  extracted_entities JSONB DEFAULT '[]', -- Entities found by AgentController
  document_references UUID[] DEFAULT '{}', -- Referenced document IDs
  ai_metadata JSONB DEFAULT '{}', -- Model used, tokens, confidence, etc.
  feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
  feedback_comment TEXT,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legal references and knowledge base
CREATE TABLE public.legal_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_id TEXT UNIQUE NOT NULL, -- e.g., "LOV-2023-123"
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_vector vector(1536),
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('law', 'regulation', 'case', 'guideline')) NOT NULL,
  effective_date DATE,
  last_updated TIMESTAMP WITH TIME ZONE,
  relevance_score REAL DEFAULT 0.0,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance companies and products
CREATE TABLE public.insurance_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  registration_number TEXT UNIQUE, -- CVR nummer
  website TEXT,
  contact_info JSONB DEFAULT '{}',
  rating REAL CHECK (rating BETWEEN 0 AND 5),
  specialties TEXT[] DEFAULT '{}', -- Areas of expertise
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.insurance_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.insurance_companies(id),
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL, -- 'car', 'home', 'life', etc.
  coverage_details JSONB NOT NULL,
  pricing_info JSONB DEFAULT '{}',
  terms_and_conditions TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- User insurance portfolio
CREATE TABLE public.user_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.insurance_companies(id),
  product_id UUID REFERENCES public.insurance_products(id),
  policy_number TEXT,
  policy_type TEXT NOT NULL,
  coverage_amount DECIMAL(15,2),
  premium_amount DECIMAL(10,2),
  deductible_amount DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  status TEXT CHECK (status IN ('active', 'expired', 'cancelled', 'pending')) DEFAULT 'active',
  documents UUID[] DEFAULT '{}', -- Related document IDs
  claims_history UUID[] DEFAULT '{}', -- Related claim IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claims and incidents
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.user_policies(id),
  claim_number TEXT UNIQUE,
  incident_date DATE NOT NULL,
  reported_date DATE DEFAULT CURRENT_DATE,
  claim_type TEXT NOT NULL, -- 'damage', 'theft', 'liability', etc.
  description TEXT NOT NULL,
  estimated_amount DECIMAL(15,2),
  approved_amount DECIMAL(15,2),
  status TEXT CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'settled', 'closed')) DEFAULT 'submitted',
  documents UUID[] DEFAULT '{}',
  timeline JSONB DEFAULT '[]', -- Status changes with timestamps
  ai_risk_assessment JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI insights and recommendations
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'coverage_gap', 'cost_optimization', 'renewal_reminder', etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  data_sources JSONB DEFAULT '{}', -- What data led to this insight
  recommended_actions JSONB DEFAULT '[]',
  confidence_score REAL CHECK (confidence_score BETWEEN 0 AND 1),
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feedback and ratings
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id),
  conversation_id UUID REFERENCES public.conversations(id),
  feedback_type TEXT CHECK (feedback_type IN ('rating', 'comment', 'bug_report', 'feature_request')) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  categories TEXT[] DEFAULT '{}', -- 'helpful', 'accurate', 'clear', etc.
  metadata JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System analytics and logs
CREATE TABLE public.system_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  session_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consent and privacy management
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'data_processing', 'marketing', 'analytics', etc.
  consent_given BOOLEAN NOT NULL,
  consent_version TEXT NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL, -- GDPR Article 6 basis
  metadata JSONB DEFAULT '{}',
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market intelligence data
CREATE TABLE public.market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_type TEXT NOT NULL, -- 'price_comparison', 'product_update', 'industry_trend'
  source TEXT NOT NULL,
  content JSONB NOT NULL,
  relevance_tags TEXT[] DEFAULT '{}',
  confidence_score REAL CHECK (confidence_score BETWEEN 0 AND 1),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy documents with extracted content for AI analysis
CREATE TABLE public.policy_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.user_policies(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  extracted_text TEXT,
  structured_data JSONB DEFAULT '{}', -- AI-extracted policy details
  coverage_analysis JSONB DEFAULT '{}', -- AI-analyzed coverage details
  exclusions_analysis JSONB DEFAULT '{}', -- AI-identified exclusions and limitations
  risk_flags JSONB DEFAULT '[]', -- Potentially problematic clauses
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy comparison sessions
CREATE TABLE public.policy_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  comparison_name TEXT NOT NULL,
  existing_policies UUID[] DEFAULT '{}', -- Array of policy IDs
  new_offers JSONB DEFAULT '[]', -- Array of uploaded offer documents/data
  comparison_results JSONB DEFAULT '{}', -- AI analysis results
  advantages JSONB DEFAULT '[]', -- Advantages of new vs old
  disadvantages JSONB DEFAULT '[]', -- Disadvantages of new vs old
  risk_warnings JSONB DEFAULT '[]', -- Flagged problematic clauses
  recommendation JSONB DEFAULT '{}', -- AI recommendation with reasoning
  status TEXT CHECK (status IN ('analyzing', 'completed', 'archived')) DEFAULT 'analyzing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-detected policy issues and red flags
CREATE TABLE public.policy_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.user_policies(id),
  comparison_id UUID REFERENCES public.policy_comparisons(id),
  issue_type TEXT NOT NULL, -- 'exclusion', 'limitation', 'twist', 'ambiguity', 'coverage_gap'
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_text TEXT, -- The actual clause that caused the flag
  ai_confidence REAL CHECK (ai_confidence BETWEEN 0 AND 1),
  potential_impact TEXT, -- What could happen because of this issue
  recommendations TEXT[], -- How to address this issue
  is_acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User's uploaded insurance offers for comparison
CREATE TABLE public.insurance_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  comparison_id UUID REFERENCES public.policy_comparisons(id),
  company_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  offer_type TEXT NOT NULL, -- 'quote', 'proposal', 'policy_draft'
  document_id UUID REFERENCES public.documents(id),
  extracted_data JSONB DEFAULT '{}', -- AI-extracted offer details
  pricing_breakdown JSONB DEFAULT '{}',
  coverage_details JSONB DEFAULT '{}',
  terms_analysis JSONB DEFAULT '{}',
  ai_score REAL CHECK (ai_score BETWEEN 0 AND 100), -- Overall AI evaluation score
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_legal_references_type ON public.legal_references(source_type);
CREATE INDEX idx_user_policies_user ON public.user_policies(user_id);
CREATE INDEX idx_user_policies_status ON public.user_policies(status);
CREATE INDEX idx_claims_user ON public.claims(user_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_ai_insights_user ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_priority ON public.ai_insights(priority);
CREATE INDEX idx_feedback_user ON public.feedback(user_id);
CREATE INDEX idx_system_analytics_event ON public.system_analytics(event_type);
CREATE INDEX idx_system_analytics_created ON public.system_analytics(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own policies" ON public.user_policies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own policies" ON public.user_policies FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own claims" ON public.claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own claims" ON public.claims FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own insights" ON public.ai_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON public.ai_insights FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can submit feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own consents" ON public.user_consents FOR ALL USING (auth.uid() = user_id);

-- Legal references and market data are publicly readable
CREATE POLICY "Legal references are publicly readable" ON public.legal_references FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Insurance companies are publicly readable" ON public.insurance_companies FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Insurance products are publicly readable" ON public.insurance_products FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Market data is publicly readable" ON public.market_data FOR SELECT TO authenticated USING (valid_until > NOW() OR valid_until IS NULL);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_policies_updated_at BEFORE UPDATE ON public.user_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 