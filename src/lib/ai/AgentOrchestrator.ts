import OpenAI from 'openai'
import { DocumentProcessor } from '@/lib/document/DocumentProcessor'
import { createClient } from '@/lib/supabase/client'

interface UserContext {
  userId: string
  userProfile?: Record<string, unknown>
  documents: string[]
  conversationHistory: Array<{ role: string; content: string }>
  sessionSummary?: string
}

interface AgentResponse {
  content: string
  confidence: number
  agentUsed: string
  sources: string[]
  followUpSuggestions: string[]
  metadata: Record<string, unknown>
}

interface QueryClassification {
  intent: 'advice' | 'legal' | 'claim' | 'comparison' | 'general'
  complexity: number // 0-1
  urgency: 'low' | 'medium' | 'high'
  requiredAgents: string[]
}

export class AgentOrchestrator {
  private openai: OpenAI
  private documentProcessor: DocumentProcessor
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    })
    this.documentProcessor = new DocumentProcessor()
    this.supabase = createClient()
  }

  async processQuery(query: string, context: UserContext): Promise<AgentResponse> {
    try {
      // Step 1: Classify the query
      const classification = await this.classifyQuery(query, context)
      
      // Step 2: Select and route to appropriate agent(s)
      if (classification.complexity > 0.7 || classification.requiredAgents.length > 1) {
        return await this.collaborativeProcessing(query, context, classification)
      } else {
        return await this.singleAgentProcessing(query, context, classification)
      }

    } catch {
      console.error('Agent orchestration error occurred')
      return {
        content: 'Beklager, der opstod en teknisk fejl. Prøv venligst igen senere.',
        confidence: 0,
        agentUsed: 'error_handler',
        sources: [],
        followUpSuggestions: [],
        metadata: { error: 'Unknown orchestration error' }
      }
    }
  }

  private async classifyQuery(query: string, context: UserContext): Promise<QueryClassification> {
    const classificationPrompt = `
Klassificer denne danske forsikringsforespørgsel:

Forespørgsel: "${query}"

Kontekst:
- Bruger har ${context.documents.length} dokumenter
- Samtalehistorik: ${context.conversationHistory.length} beskeder
${context.sessionSummary ? `- Session sammenfatning: ${context.sessionSummary}` : ''}

Returner JSON:
{
  "intent": "advice|legal|claim|comparison|general",
  "complexity": 0.0-1.0,
  "urgency": "low|medium|high",
  "requiredAgents": ["advisor", "legal", "claim", "comparison"]
}

Klassificering:`

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: classificationPrompt }],
        temperature: 0.1,
        max_tokens: 200
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        intent: result.intent || 'general',
        complexity: result.complexity || 0.5,
        urgency: result.urgency || 'medium',
        requiredAgents: result.requiredAgents || ['advisor']
      }
    } catch {
      // Fallback classification
      return {
        intent: 'general',
        complexity: 0.5,
        urgency: 'medium',
        requiredAgents: ['advisor']
      }
    }
  }

  private async singleAgentProcessing(
    query: string, 
    context: UserContext, 
    classification: QueryClassification
  ): Promise<AgentResponse> {
    const primaryAgent = classification.requiredAgents[0]
    
    switch (primaryAgent) {
      case 'legal':
        return await this.legalAgent(query)
      case 'claim':
                  return await this.claimAgent(query)
      case 'comparison':
                  return await this.comparisonAgent(query)
      default:
        return await this.advisorAgent(query, context)
    }
  }

  private async collaborativeProcessing(
    query: string, 
    context: UserContext, 
    classification: QueryClassification
  ): Promise<AgentResponse> {
    const responses: AgentResponse[] = []
    
    // Get responses from multiple agents
    for (const agentType of classification.requiredAgents) {
      try {
        let response: AgentResponse
        switch (agentType) {
          case 'legal':
            response = await this.legalAgent(query)
            break
          case 'claim':
                          response = await this.claimAgent(query)
            break
          case 'comparison':
                          response = await this.comparisonAgent(query)
            break
          default:
            response = await this.advisorAgent(query, context)
        }
        responses.push(response)
      } catch (agentError) {
        console.error(`Error in ${agentType} agent:`, agentError)
      }
    }

    // Synthesize responses
          return await this.synthesizeResponses(query, responses)
  }

  private async advisorAgent(query: string, context: UserContext): Promise<AgentResponse> {
    const advisorPrompt = await this.buildAdvisorPrompt(query, context)
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: advisorPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    const content = response.choices[0]?.message?.content || ''
    
    return {
      content,
      confidence: 0.85,
      agentUsed: 'advisor',
      sources: ['AI Forsikringsrådgiver'],
      followUpSuggestions: this.generateFollowUpSuggestions(query, 'advice'),
      metadata: {
        model: 'gpt-4',
        tokens: response.usage?.total_tokens || 0
      }
    }
  }

  private async legalAgent(query: string): Promise<AgentResponse> {
    // Get relevant legal references
    const legalRefs = await this.getLegalReferences()
    
    const legalPrompt = `
Du er en ekspert i dansk forsikringsret. Din opgave er at give præcis juridisk vejledning.

Brugerens spørgsmål: ${query}

Relevante lovparagraffer og retspraksis:
${legalRefs}

VIGTIGE RETNINGSLINJER:
- Giv ALTID kildehenvisninger til specifikke lovparagraffer
- Vær præcis og faktuel
- Angiv altid at dette ikke er definitiv juridisk rådgivning
- Anbefal advokat ved komplekse sager
- Svar på dansk

Format dit svar som:
## Juridisk Vurdering
[Din analyse]

## Relevante Lovbestemmelser
[Specifikke paragraffer med kilder]

## Anbefalinger
[Konkrete næste skridt]

## ⚠️ Vigtig Note
Dette er ikke definitiv juridisk rådgivning. Ved komplekse sager anbefales konsultation med advokat.`

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: legalPrompt }],
      temperature: 0.1,
      max_tokens: 1200
    })

    return {
      content: response.choices[0]?.message?.content || '',
      confidence: 0.9,
      agentUsed: 'legal',
      sources: ['Retsinformation.dk', 'Dansk forsikringslovgivning'],
      followUpSuggestions: this.generateFollowUpSuggestions(query, 'legal'),
      metadata: {
        legalReferencesUsed: legalRefs.length,
        model: 'gpt-4'
      }
    }
  }

  private async claimAgent(query: string): Promise<AgentResponse> {
    const claimPrompt = `
Du er ekspert i danske forsikringsskader og anmeldelsesprocesser.

Brugerens spørgsmål: ${query}

Din opgave:
1. Analysér skadetypen og dækningsmulighederne
2. Guide gennem anmeldelsesprocessen
3. Estimer sagsbehandlingstid
4. Identificer nødvendige dokumenter
5. Vurder potentielle udfordringer

Strukturer dit svar:
## Skadeanalyse
[Vurdering af skadetype og årsag]

## Anmeldelsesproces
[Trin-for-trin guide]

## Påkrævede Dokumenter
[Liste over nødvendige bilag]

## Forventet Tidshorisont
[Realistisk vurdering]

## Potentielle Udfordringer
[Mulige problemer og løsninger]

Vær konkret og handlingsorienteret. Brug danske forsikringsvilkår og -processer.`

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: claimPrompt }],
      temperature: 0.2,
      max_tokens: 1400
    })

    return {
      content: response.choices[0]?.message?.content || '',
      confidence: 0.88,
      agentUsed: 'claim',
      sources: ['Danske forsikringsselskaber', 'Standardprocedurer'],
      followUpSuggestions: this.generateFollowUpSuggestions(query, 'claim'),
      metadata: {
        claimType: this.extractClaimType(query),
        urgency: this.assessClaimUrgency(query)
      }
    }
  }

  private async comparisonAgent(query: string): Promise<AgentResponse> {
    const comparisonPrompt = `
Du er ekspert i sammenligning af forsikringsprodukter på det danske marked.

Brugerens spørgsmål: ${query}

Din opgave:
1. Identificer relevante forsikringstyper
2. Sammenlign minimum 3 alternativer
3. Fremhæv vigtige forskelle
4. Beregn cost/benefit
5. Giv klar anbefaling

Strukturer dit svar:
## Produktsammenligning
[Detaljeret sammenligning i tabelform]

## Vigtige Forskelle
[Væsentlige punkter at være opmærksom på]

## Anbefaling
[Klar anbefaling med begrundelse]

## Næste Skridt
[Hvordan man kommer videre]

Basér sammenligningen på danske forhold og aktuelle markedspriser.`

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: comparisonPrompt }],
      temperature: 0.3,
      max_tokens: 1600
    })

    return {
      content: response.choices[0]?.message?.content || '',
      confidence: 0.82,
      agentUsed: 'comparison',
      sources: ['Markedsdata', 'Produktsammenligning'],
      followUpSuggestions: this.generateFollowUpSuggestions(query, 'comparison'),
      metadata: {
        productsCompared: 3,
        comparisonType: this.extractComparisonType(query)
      }
    }
  }

  private async synthesizeResponses(
    query: string, 
    responses: AgentResponse[]
  ): Promise<AgentResponse> {
    const synthesisPrompt = `
Du skal sammenfatte og integrere flere AI-agenters svar til én sammenhængende respons.

Oprindeligt spørgsmål: ${query}

Agent svar:
${responses.map((r, i) => `
${i + 1}. ${r.agentUsed} Agent (${r.confidence} confidence):
${r.content}
`).join('\n')}

Lav et sammenhængende, velstruktureret svar der:
1. Kombinerer de bedste indsigter fra hver agent
2. Eliminerer gentagelser
3. Prioriterer efter relevans og confidence
4. Bevarer alle vigtige kilder og anbefalinger
5. Slutter med klare næste skridt

Bevar dansk sprog og forsikringsterminologi.`

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: synthesisPrompt }],
      temperature: 0.2,
      max_tokens: 2000
    })

    const allSources = Array.from(new Set(responses.flatMap(r => r.sources)))
    const allSuggestions = Array.from(new Set(responses.flatMap(r => r.followUpSuggestions)))
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length

    return {
      content: response.choices[0]?.message?.content || '',
      confidence: avgConfidence,
      agentUsed: 'orchestrator',
      sources: allSources,
      followUpSuggestions: allSuggestions.slice(0, 5), // Top 5 suggestions
      metadata: {
        agentsUsed: responses.map(r => r.agentUsed),
        synthesisModel: 'gpt-4'
      }
    }
  }

  private async buildAdvisorPrompt(query: string, context: UserContext): Promise<string> {
    let prompt = `Du er en ekspert dansk forsikringsrådgiver og AI-assistent.

BRUGERENS SITUATION:
`

    if (context.sessionSummary) {
      prompt += `Samtale sammenfatning: ${context.sessionSummary}\n`
    }

    if (context.documents.length > 0) {
      const documentInsights = await this.documentProcessor.getDocumentInsights(context.documents)
      prompt += `\n${documentInsights}\n`
    }

    prompt += `
DINE KERNEKOMPETENCER:
1. Forsikringsrådgivning på dansk
2. Dokumentanalyse og fortolkning
3. Juridisk vejledning (men ikke juridisk rådgivning)
4. Skadeprocesser og anmeldelser

SVAR STRUKTUR:
## Kort Svar
[Direkte svar i 1-2 linjer]

## Detaljeret Forklaring
[Uddybende information]

## Næste Skridt
[Konkrete handlingsanvisninger]

## Kilder
[Relevante kilder og referencer]

## ⚠️ Vigtig Note
[Advarsler eller anbefalinger om professionel hjælp]

VIGTIGE RETNINGSLINJER:
- Svar ALTID på dansk
- Vær præcis og hjælpsom
- Brug konkrete eksempler
- Angiv altid at dette ikke er definitiv juridisk rådgivning
- Anbefal professionel hjælp ved komplekse sager
- Referencér til brugerens dokumenter når relevant`

    return prompt
  }

  private async getLegalReferences(): Promise<string> {
    // In a real implementation, this would search the legal_references table
    // For now, return placeholder
    return 'Relevante lovparagraffer vil blive hentet fra Retsinformation.dk databasen.'
  }

  private generateFollowUpSuggestions(query: string, type: string): string[] {
    const suggestions: Record<string, string[]> = {
      advice: [
        'Skal jeg sammenligne flere forsikringsselskaber?',
        'Hvad er den optimale selvrisiko for mig?',
        'Har jeg huller i min dækning?'
      ],
      legal: [
        'Hvad er mine rettigheder som forsikringstager?',
        'Kan jeg klage over afgørelsen?',
        'Skal jeg kontakte en advokat?'
      ],
      claim: [
        'Hvilke dokumenter skal jeg samle?',
        'Hvor lang tid tager sagsbehandlingen?',
        'Hvad hvis min skade afvises?'
      ],
      comparison: [
        'Kan du beregne mine årlige besparelser?',
        'Hvad er forskellen på dækningsområderne?',
        'Hvilke ekstra tilvalg anbefaler du?'
      ]
    }

    return suggestions[type] || suggestions.advice
  }

  private extractClaimType(query: string): string {
    const claimTypes = ['vandskade', 'brand', 'tyveri', 'påkørsel', 'storm', 'glasskade']
    const lowerQuery = query.toLowerCase()
    
    for (const type of claimTypes) {
      if (lowerQuery.includes(type)) {
        return type
      }
    }
    
    return 'unknown'
  }

  private assessClaimUrgency(query: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['akut', 'haster', 'øjeblikkelig', 'nu', 'straks']
    const lowerQuery = query.toLowerCase()
    
    if (urgentKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'high'
    }
    
    return 'medium'
  }

  private extractComparisonType(query: string): string {
    const comparisonTypes = ['bil', 'hus', 'indbo', 'rejse', 'liv', 'erhverv']
    const lowerQuery = query.toLowerCase()
    
    for (const type of comparisonTypes) {
      if (lowerQuery.includes(type)) {
        return type + 'forsikring'
      }
    }
    
    return 'general'
  }
} 