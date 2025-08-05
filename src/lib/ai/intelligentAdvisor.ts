import { OpenAI } from 'openai'

interface UserProfile {
  age?: number
  location?: string
  familyStatus?: 'single' | 'married' | 'divorced' | 'widowed'
  children?: number
  occupation?: string
  income?: number
  assets?: {
    home?: { value: number; type: 'owned' | 'rented' }
    vehicles?: Array<{ type: string; value: number; year: number }>
    valuables?: number
  }
  riskTolerance?: 'low' | 'medium' | 'high'
  lifeEvents?: Array<{
    type: 'birth' | 'marriage' | 'divorce' | 'job_change' | 'move' | 'retirement'
    date: string
    details?: string
  }>
}

interface InsuranceGap {
  type: 'coverage_gap' | 'over_insured' | 'price_optimization' | 'risk_exposure'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  potentialSavings?: number
  riskAmount?: number
}

interface MarketInsight {
  type: 'price_trend' | 'new_product' | 'regulatory_change' | 'market_opportunity'
  relevance: number // 0-100
  title: string
  description: string
  actionRequired: boolean
  deadline?: string
}

export class IntelligentAdvisor {
  private openai: OpenAI

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }

  async analyzeUserProfile(profile: UserProfile): Promise<{
    tryghedsscore: number
    gaps: InsuranceGap[]
    recommendations: string[]
    nextActions: string[]
  }> {
    const prompt = `
Analyser denne danske brugers forsikringsprofil og vurder deres tryghed:

BRUGERPROFIL:
- Alder: ${profile.age || 'Ukendt'}
- Bopæl: ${profile.location || 'Ukendt'}
- Familiestand: ${profile.familyStatus || 'Ukendt'}
- Børn: ${profile.children || 0}
- Erhverv: ${profile.occupation || 'Ukendt'}
- Indkomst: ${profile.income ? profile.income.toLocaleString('da-DK') + ' kr' : 'Ukendt'}
- Bolig: ${profile.assets?.home ? `${profile.assets.home.type}, værdi ${profile.assets.home.value.toLocaleString('da-DK')} kr` : 'Ukendt'}
- Køretøjer: ${profile.assets?.vehicles?.length || 0} stk
- Risikotolerance: ${profile.riskTolerance || 'Ukendt'}

Vurder følgende på dansk:
1. TRYGHEDSSCORE (0-100): Hvor godt beskyttet er brugeren?
2. FORSIKRINGSGAB: Hvilke mangler er der i dækningen?
3. ANBEFALINGER: Top 3 konkrete handlinger
4. NÆSTE SKRIDT: Hvad skal brugeren gøre nu?

Fokuser på danske forsikringstyper og lovgivning. Vær konkret og handlingsanvisende.
`

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      })

      const analysis = response.choices[0]?.message?.content || ''
      
      // Parse AI response (simplified - in production use structured output)
      const tryghedsscore = this.extractTryghesscore(analysis)
      const gaps = this.extractGaps(analysis)
      const recommendations = this.extractRecommendations(analysis)
      const nextActions = this.extractNextActions(analysis)

      return {
        tryghedsscore,
        gaps,
        recommendations,
        nextActions
      }
    } catch (error) {
      console.error('Error analyzing user profile:', error)
      return {
        tryghedsscore: 50,
        gaps: [],
        recommendations: ['Upload dine forsikringsdokumenter for personlig analyse'],
        nextActions: ['Start med at uploade dine nuværende policer']
      }
    }
  }

  async generateProactiveInsights(userContext: {
    profile: UserProfile
    policies: any[]
    recentActivity: string[]
    marketData?: any
  }): Promise<MarketInsight[]> {
    const insights: MarketInsight[] = []

    // Life event triggers
    const recentLifeEvents = userContext.profile.lifeEvents?.filter(
      event => new Date(event.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ) || []

    for (const event of recentLifeEvents) {
      switch (event.type) {
        case 'birth':
          insights.push({
            type: 'market_opportunity',
            relevance: 95,
            title: 'Børneforsikring efter fødsel',
            description: 'Nu hvor I har fået et barn, bør I overveje børneforsikring og opdatere jeres livsforsikringer.',
            actionRequired: true,
            deadline: '30 dage efter fødsel for bedst dækning'
          })
          break
        case 'move':
          insights.push({
            type: 'market_opportunity',
            relevance: 90,
            title: 'Indboforsikring efter flytning',
            description: 'Husk at opdatere jeres indboforsikring med ny adresse og evt. ændret værdi.',
            actionRequired: true
          })
          break
      }
    }

    // Market-based insights (simulated - in production, integrate real market data)
    if (userContext.policies.length > 0) {
      insights.push({
        type: 'price_trend',
        relevance: 75,
        title: 'Potentiel besparelse på bilforsikring',
        description: 'Markedet har set et prisfald på 8% for bilforsikringer. Du kan potentielt spare 1.200-2.400 kr årligt.',
        actionRequired: false
      })
    }

    return insights.sort((a, b) => b.relevance - a.relevance)
  }

  async calculateTryghedsscore(userdata: {
    policies: any[]
    profile: UserProfile
    gaps: InsuranceGap[]
  }): Promise<{
    score: number
    breakdown: {
      category: string
      score: number
      weight: number
      issues: string[]
    }[]
    improvement: string[]
  }> {
    const categories = [
      {
        name: 'Livsforsikring',
        weight: 25,
        check: () => this.checkLifeInsurance(userdata),
      },
      {
        name: 'Indboforsikring',
        weight: 20,
        check: () => this.checkHomeInsurance(userdata),
      },
      {
        name: 'Bilforsikring',
        weight: 15,
        check: () => this.checkCarInsurance(userdata),
      },
      {
        name: 'Ansvarsforsikring',
        weight: 15,
        check: () => this.checkLiabilityInsurance(userdata),
      },
      {
        name: 'Sundhedsforsikring',
        weight: 15,
        check: () => this.checkHealthInsurance(userdata),
      },
      {
        name: 'Pensionsforsikring',
        weight: 10,
        check: () => this.checkPensionInsurance(userdata),
      }
    ]

    const breakdown = categories.map(category => {
      const result = category.check()
      return {
        category: category.name,
        score: result.score,
        weight: category.weight,
        issues: result.issues
      }
    })

    const weightedScore = breakdown.reduce((total, cat) => 
      total + (cat.score * cat.weight / 100), 0
    )

    const improvement = breakdown
      .filter(cat => cat.score < 80)
      .map(cat => `Forbedre ${cat.category.toLowerCase()}: ${cat.issues.join(', ')}`)

    return {
      score: Math.round(weightedScore),
      breakdown,
      improvement
    }
  }

  private extractTryghesscore(analysis: string): number {
    const match = analysis.match(/TRYGHEDSSCORE.*?(\d+)/i)
    return match ? parseInt(match[1]) : 50
  }

  private extractGaps(analysis: string): InsuranceGap[] {
    // Simplified parsing - in production use structured AI output
    const gaps: InsuranceGap[] = []
    
    if (analysis.toLowerCase().includes('livsforsikring')) {
      gaps.push({
        type: 'coverage_gap',
        severity: 'high',
        title: 'Manglende livsforsikring',
        description: 'Du har ikke tilstrækkelig livsforsikring til at dække din families behov.',
        recommendation: 'Overvej en livsforsikring på minimum 3-5 årslønninger.',
        riskAmount: 1000000
      })
    }

    return gaps
  }

  private extractRecommendations(analysis: string): string[] {
    // Extract recommendations from AI response
    const lines = analysis.split('\n')
    const recommendations: string[] = []
    
    let inRecommendationsSection = false
    for (const line of lines) {
      if (line.toLowerCase().includes('anbefaling')) {
        inRecommendationsSection = true
        continue
      }
      if (inRecommendationsSection && line.trim()) {
        if (line.includes('NÆSTE') || line.includes('SKRIDT')) break
        recommendations.push(line.replace(/^\d+\.?\s*/, '').trim())
      }
    }

    return recommendations.filter(r => r.length > 10).slice(0, 3)
  }

  private extractNextActions(analysis: string): string[] {
    // Extract next actions from AI response
    const lines = analysis.split('\n')
    const actions: string[] = []
    
    let inActionsSection = false
    for (const line of lines) {
      if (line.toLowerCase().includes('næste') && line.toLowerCase().includes('skridt')) {
        inActionsSection = true
        continue
      }
      if (inActionsSection && line.trim()) {
        actions.push(line.replace(/^\d+\.?\s*/, '').trim())
      }
    }

    return actions.filter(a => a.length > 5).slice(0, 4)
  }

  private checkLifeInsurance(userdata: any) {
    const hasLifeInsurance = userdata.policies.some((p: any) => 
      p.policyType?.toLowerCase().includes('liv')
    )
    
    if (!hasLifeInsurance && userdata.profile.familyStatus !== 'single') {
      return {
        score: 20,
        issues: ['Ingen livsforsikring med familie']
      }
    }
    
    return { score: hasLifeInsurance ? 90 : 70, issues: [] }
  }

  private checkHomeInsurance(userdata: any) {
    const hasHomeInsurance = userdata.policies.some((p: any) => 
      p.policyType?.toLowerCase().includes('indbo') || 
      p.policyType?.toLowerCase().includes('hus')
    )
    
    return { 
      score: hasHomeInsurance ? 85 : 10, 
      issues: hasHomeInsurance ? [] : ['Mangler indbo-/husforsikring']
    }
  }

  private checkCarInsurance(userdata: any) {
    const hasCar = userdata.profile.assets?.vehicles?.length > 0
    const hasCarInsurance = userdata.policies.some((p: any) => 
      p.policyType?.toLowerCase().includes('bil') ||
      p.policyType?.toLowerCase().includes('motor')
    )
    
    if (hasCar && !hasCarInsurance) {
      return { score: 0, issues: ['Mangler bilforsikring til registreret køretøj'] }
    }
    
    return { score: hasCar ? (hasCarInsurance ? 90 : 30) : 100, issues: [] }
  }

  private checkLiabilityInsurance(userdata: any) {
    const hasLiability = userdata.policies.some((p: any) => 
      p.policyType?.toLowerCase().includes('ansvar')
    )
    
    return { 
      score: hasLiability ? 85 : 40, 
      issues: hasLiability ? [] : ['Overvej ansvarsforsikring']
    }
  }

  private checkHealthInsurance(userdata: any) {
    const hasHealth = userdata.policies.some((p: any) => 
      p.policyType?.toLowerCase().includes('sundhed') ||
      p.policyType?.toLowerCase().includes('syge')
    )
    
    return { 
      score: hasHealth ? 80 : 60, 
      issues: hasHealth ? [] : ['Overvej privat sundhedsforsikring']
    }
  }

  private checkPensionInsurance(userdata: any) {
    const hasPension = userdata.policies.some((p: any) => 
      p.policyType?.toLowerCase().includes('pension')
    )
    
    const age = userdata.profile.age || 30
    if (age > 50 && !hasPension) {
      return { score: 30, issues: ['Mangler pensionsopsparing'] }
    }
    
    return { score: hasPension ? 80 : 70, issues: [] }
  }
} 