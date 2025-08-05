import { createClient } from '@/lib/supabase/client'
import OpenAI from 'openai'
import type { UserProfile, Document, UserPolicy, Claim, AIInsight } from '@/lib/supabase/client'

interface CoverageGap {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  recommendation: string
  estimatedCost?: number
}

interface CostOptimization {
  type: 'deductible' | 'coverage' | 'provider' | 'bundling'
  currentCost: number
  potentialSaving: number
  description: string
  actionRequired: string
  riskLevel: 'low' | 'medium' | 'high'
}

interface RenewalReminder {
  policyId: string
  policyType: string
  expirationDate: string
  daysUntilExpiration: number
  priority: 'low' | 'medium' | 'high'
  recommendation: string
}

interface ClaimOpportunity {
  incidentType: string
  confidence: number
  description: string
  estimatedValue: number
  timeLimit: string
  requiredDocuments: string[]
}

interface ProactiveInsights {
  coverageGaps: CoverageGap[]
  costOptimizations: CostOptimization[]
  renewalReminders: RenewalReminder[]
  claimOpportunities: ClaimOpportunity[]
  riskAlerts: Record<string, unknown>[]
  marketOpportunities: Record<string, unknown>[]
}

export class ProactiveInsuranceAgent {
  private supabase: ReturnType<typeof createClient>
  private openai: OpenAI

  constructor() {
    this.supabase = createClient()
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    })
  }

  async analyzeUserSituation(userId: string): Promise<ProactiveInsights> {
    try {
      // Gather user data
      const [profile, documents, policies, , chatHistory] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserDocuments(userId),
        this.getUserPolicies(userId),
        this.getUserClaims(userId),
        this.getChatHistory(userId)
      ])

      // Perform analyses
      const [
        coverageGaps,
        costOptimizations,
        renewalReminders,
        claimOpportunities
      ] = await Promise.all([
        this.detectCoverageGaps(profile, documents, policies),
        this.identifyCostOptimizations(policies, profile),
        this.checkRenewalDates(policies),
        this.identifyClaimOpportunities(chatHistory)
      ])

      return {
        coverageGaps,
        costOptimizations,
        renewalReminders,
        claimOpportunities,
        riskAlerts: [],
        marketOpportunities: []
      }

    } catch (error) {
      console.error('Error analyzing user situation:', error)
      return {
        coverageGaps: [],
        costOptimizations: [],
        renewalReminders: [],
        claimOpportunities: [],
        riskAlerts: [],
        marketOpportunities: []
      }
    }
  }

  private async detectCoverageGaps(
    profile: UserProfile | null,
    documents: Document[],
    policies: UserPolicy[]
  ): Promise<CoverageGap[]> {
    const gaps: CoverageGap[] = []

    if (!profile) return gaps

    // Check for basic coverage types
    const policyTypes = policies.map(p => p.policy_type.toLowerCase())
    
    // Age-based recommendations
    const age = profile.date_of_birth ? 
      new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 0

    if (age >= 18 && !policyTypes.includes('ansvarsforsikring')) {
      gaps.push({
        type: 'ansvarsforsikring',
        severity: 'high',
        description: 'Du mangler en privat ansvarsforsikring, som er essentiel for alle voksne.',
        recommendation: 'Tegn en privat ansvarsforsikring hurtigst muligt. Det er billigt og dækker store økonomiske risici.',
        estimatedCost: 1200
      })
    }

    if (age >= 25 && !policyTypes.includes('indboforsikring')) {
      gaps.push({
        type: 'indboforsikring',
        severity: 'medium',
        description: 'En indboforsikring beskytter dine ejendele mod tyveri, brand og vandskade.',
        recommendation: 'Overvej en indboforsikring, især hvis du bor i eget hjem eller har værdifulde ejendele.',
        estimatedCost: 2400
      })
    }

    // Address-based recommendations
    if (profile.address) {
      const address = profile.address as Record<string, unknown>
      if (address.type === 'house' && !policyTypes.includes('husejerforsikring')) {
        gaps.push({
          type: 'husejerforsikring',
          severity: 'high',
          description: 'Som husejer har du brug for en husejerforsikring til bygningen.',
          recommendation: 'Tegn husejerforsikring omgående. Det er ofte et krav fra realkreditlånet.',
          estimatedCost: 8000
        })
      }
    }

    return gaps
  }

  private async identifyCostOptimizations(
    policies: UserPolicy[],
    profile: UserProfile | null
  ): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = []

    for (const policy of policies) {
      // Check deductible optimization
      if (policy.deductible_amount && policy.premium_amount) {
        const currentDeductible = policy.deductible_amount
        const currentPremium = policy.premium_amount

        if (currentDeductible < 5000 && currentPremium > 3000) {
          const potentialSaving = currentPremium * 0.15 // Estimate 15% saving
          optimizations.push({
            type: 'deductible',
            currentCost: currentPremium,
            potentialSaving,
            description: `Ved at øge selvrisikoen på din ${policy.policy_type} fra ${currentDeductible} kr til 5.000 kr kan du spare på præmien.`,
            actionRequired: 'Kontakt dit forsikringsselskab for at justere selvrisikoen',
            riskLevel: 'low'
          })
        }
      }

      // Check for overpayment based on age
      if (profile?.date_of_birth && policy.premium_amount) {
        const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
        
        if (policy.policy_type === 'bilforsikring' && age > 25 && policy.premium_amount > 8000) {
          optimizations.push({
            type: 'provider',
            currentCost: policy.premium_amount,
            potentialSaving: policy.premium_amount * 0.2,
            description: 'Din bilforsikring virker dyr for din alder. Unge førere kan ofte få bedre priser andre steder.',
            actionRequired: 'Indhent tilbud fra andre selskaber',
            riskLevel: 'low'
          })
        }
      }
    }

    // Bundle optimization
    if (policies.length >= 2) {
      const totalPremium = policies.reduce((sum, p) => sum + (p.premium_amount || 0), 0)
      const companies = new Set(policies.map(p => p.company_id).filter(Boolean))
      
      if (companies.size > 1) {
        optimizations.push({
          type: 'bundling',
          currentCost: totalPremium,
          potentialSaving: totalPremium * 0.1,
          description: 'Du har forsikringer hos flere selskaber. Ved at samle dem kan du få paketrabat.',
          actionRequired: 'Få tilbud på samling af forsikringer',
          riskLevel: 'low'
        })
      }
    }

    return optimizations
  }

  private async checkRenewalDates(policies: UserPolicy[]): Promise<RenewalReminder[]> {
    const reminders: RenewalReminder[] = []
    const today = new Date()

    for (const policy of policies) {
      if (policy.end_date) {
        const endDate = new Date(policy.end_date)
        const daysUntilExpiration = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilExpiration <= 60 && daysUntilExpiration > 0) {
          let priority: 'low' | 'medium' | 'high' = 'low'
          let recommendation = ''

          if (daysUntilExpiration <= 14) {
            priority = 'high'
            recommendation = 'HASTER: Forny eller skift forsikring NU for at undgå dækningshuller!'
          } else if (daysUntilExpiration <= 30) {
            priority = 'medium'
            recommendation = 'Tid til at handle: Sammenlign priser og forny din forsikring.'
          } else {
            priority = 'low'
            recommendation = 'Tid til planlægning: Undersøg muligheder for fornyelse eller skift.'
          }

          reminders.push({
            policyId: policy.id,
            policyType: policy.policy_type,
            expirationDate: policy.end_date,
            daysUntilExpiration,
            priority,
            recommendation
          })
        }
      }
    }

    return reminders.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
  }

  private async identifyClaimOpportunities(
    chatHistory: Record<string, unknown>[]
  ): Promise<ClaimOpportunity[]> {
    const opportunities: ClaimOpportunity[] = []

    // Analyze chat history for mentioned incidents
    const incidentKeywords = {
      'vandskade': ['vand', 'læk', 'oversvømmelse', 'rør', 'taget'],
      'tyveri': ['stjålet', 'tyveri', 'indbrud', 'mangler'],
      'skade': ['ødelagt', 'beskadiget', 'knust', 'ridset'],
      'brand': ['brand', 'ild', 'røg', 'ildebrand']
    }

    for (const message of chatHistory) {
      if (message.role === 'user') {
        const content = (message.content as string || '').toLowerCase()
        
        for (const [incidentType, keywords] of Object.entries(incidentKeywords)) {
          const matchCount = keywords.filter(keyword => content.includes(keyword)).length
          
          if (matchCount >= 2) { // At least 2 matching keywords
            opportunities.push({
              incidentType,
              confidence: Math.min(0.9, matchCount * 0.3),
              description: `Baseret på din beskrivelse lyder det som en ${incidentType} der kan være dækket af forsikring.`,
              estimatedValue: this.estimateClaimValue(incidentType),
              timeLimit: this.getClaimTimeLimit(incidentType),
              requiredDocuments: this.getRequiredDocuments(incidentType)
            })
          }
        }
      }
    }

    return opportunities
  }

  private estimateClaimValue(incidentType: string): number {
    const estimates: Record<string, number> = {
      'vandskade': 25000,
      'tyveri': 15000,
      'skade': 8000,
      'brand': 100000
    }
    return estimates[incidentType] || 10000
  }

  private getClaimTimeLimit(incidentType: string): string {
    const timeLimits: Record<string, string> = {
      'vandskade': '48 timer for akutte skader',
      'tyveri': '24 timer til politianmeldelse',
      'skade': '14 dage for anmeldelse',
      'brand': 'Øjeblikkeligt'
    }
    return timeLimits[incidentType] || '14 dage'
  }

  private getRequiredDocuments(incidentType: string): string[] {
    const documents: Record<string, string[]> = {
      'vandskade': ['Billeder af skaden', 'Håndværker rapport', 'Forsikringspolice'],
      'tyveri': ['Politianmeldelse', 'Liste over stjålne ting', 'Kvitteringer'],
      'skade': ['Billeder', 'Reparationsestimater', 'Ulykkesrapport'],
      'brand': ['Brandrapport', 'Billeder', 'Værditaksering']
    }
    return documents[incidentType] || ['Forsikringspolice', 'Dokumentation af skade']
  }

  async generateProactiveRecommendations(insights: ProactiveInsights): Promise<AIInsight[]> {
    const recommendations: Partial<AIInsight>[] = []

    // Coverage gaps
    for (const gap of insights.coverageGaps) {
      recommendations.push({
        insight_type: 'coverage_gap',
        title: `Manglende ${gap.type}`,
        description: gap.description,
        priority: gap.severity,
        recommended_actions: [gap.recommendation],
        confidence_score: 0.9,
        data_sources: { analysis: 'coverage_analysis' }
      })
    }

    // Cost optimizations
    for (const optimization of insights.costOptimizations) {
      recommendations.push({
        insight_type: 'cost_optimization',
        title: `Spar ${Math.round(optimization.potentialSaving)} kr årligt`,
        description: optimization.description,
        priority: optimization.potentialSaving > 2000 ? 'high' : 'medium',
        recommended_actions: [optimization.actionRequired],
        confidence_score: 0.8,
        data_sources: { analysis: 'cost_analysis', saving: optimization.potentialSaving }
      })
    }

    // Renewal reminders
    for (const renewal of insights.renewalReminders) {
      recommendations.push({
        insight_type: 'renewal_reminder',
        title: `${renewal.policyType} udløber om ${renewal.daysUntilExpiration} dage`,
        description: renewal.recommendation,
        priority: renewal.priority,
        recommended_actions: ['Sammenlign priser', 'Forny forsikring'],
        confidence_score: 1.0,
        data_sources: { policyId: renewal.policyId },
        expires_at: new Date(renewal.expirationDate).toISOString()
      })
    }

    // Claim opportunities
    for (const opportunity of insights.claimOpportunities) {
      recommendations.push({
        insight_type: 'claim_opportunity',
        title: `Potentiel ${opportunity.incidentType} skade`,
        description: opportunity.description,
        priority: 'high',
        recommended_actions: [`Anmeld til forsikring inden ${opportunity.timeLimit}`],
        confidence_score: opportunity.confidence,
        data_sources: { 
          incidentType: opportunity.incidentType,
          estimatedValue: opportunity.estimatedValue
        }
      })
    }

    return recommendations as AIInsight[]
  }

  // Database helper methods
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    return data
  }

  private async getUserDocuments(userId: string): Promise<Document[]> {
    const { data } = await this.supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    return data || []
  }

  private async getUserPolicies(userId: string): Promise<UserPolicy[]> {
    const { data } = await this.supabase
      .from('user_policies')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
    
    return data || []
  }

  private async getUserClaims(userId: string): Promise<Claim[]> {
    const { data } = await this.supabase
      .from('claims')
      .select('*')
      .eq('user_id', userId)
    
    return data || []
  }

  private async getChatHistory(userId: string): Promise<Record<string, unknown>[]> {
    const { data } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    return data || []
  }

  // Save insights to database
  async saveInsights(userId: string, insights: AIInsight[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_insights')
        .insert(
          insights.map(insight => ({
            ...insight,
            user_id: userId,
            created_at: new Date().toISOString()
          }))
        )

      if (error) {
        console.error('Error saving insights:', error)
      }
    } catch (error) {
      console.error('Error saving insights:', error)
    }
  }

  // Get user insights
  async getUserInsights(userId: string): Promise<AIInsight[]> {
    const { data } = await this.supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_acknowledged', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    return data || []
  }
} 