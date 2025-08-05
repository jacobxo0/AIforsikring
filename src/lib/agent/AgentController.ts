interface ExtractedEntity {
  type: 'name' | 'damage_cause' | 'policy_name' | 'date' | 'amount' | 'location'
  value: string
  confidence: number
  context: string
}

interface ChatLog {
  sessionId: string
  message: string
  role: 'user' | 'assistant'
  timestamp: Date
  extractedEntities: ExtractedEntity[]
  documentReferences: string[]
}

export class AgentController {
  private sessionId: string

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  /**
   * Analyze chat message and extract relevant insurance entities
   */
  extractEntities(message: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []

    // Danish name patterns (simplified)
    const namePattern = /\b([A-ZÆØÅ][a-zæøå]+ [A-ZÆØÅ][a-zæøå]+(?:\s[A-ZÆØÅ][a-zæøå]+)?)\b/g
    let nameMatch
    while ((nameMatch = namePattern.exec(message)) !== null) {
      entities.push({
        type: 'name',
        value: nameMatch[1],
        confidence: 0.8,
        context: this.getContext(message, nameMatch.index, 20)
      })
    }

    // Damage causes (Danish insurance terms)
    const damageTerms = [
      'vandskade', 'brand', 'indbrud', 'tyveri', 'påkørsel', 'kollision',
      'storm', 'hagl', 'frost', 'røgskade', 'glasskade', 'oversvømmelse'
    ]
    damageTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi')
      let match
      while ((match = regex.exec(message)) !== null) {
        entities.push({
          type: 'damage_cause',
          value: match[1],
          confidence: 0.9,
          context: this.getContext(message, match.index, 30)
        })
      }
    })

    // Policy names and insurance types
    const policyTerms = [
      'bilforsikring', 'indboforsikring', 'husejerforsikring', 'erhvervsforsikring',
      'rejseforsikring', 'ansvarsforsikring', 'kaskoforsikring', 'sundhedsforsikring'
    ]
    policyTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi')
      let match
      while ((match = regex.exec(message)) !== null) {
        entities.push({
          type: 'policy_name',
          value: match[1],
          confidence: 0.9,
          context: this.getContext(message, match.index, 25)
        })
      }
    })

    // Dates (Danish format)
    const datePattern = /\b(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})\b/g
    let dateMatch
    while ((dateMatch = datePattern.exec(message)) !== null) {
      entities.push({
        type: 'date',
        value: dateMatch[1],
        confidence: 0.7,
        context: this.getContext(message, dateMatch.index, 20)
      })
    }

    // Amounts (Danish currency)
    const amountPattern = /\b(\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s*(?:kr\.?|kroner|DKK))\b/gi
    let amountMatch
    while ((amountMatch = amountPattern.exec(message)) !== null) {
      entities.push({
        type: 'amount',
        value: amountMatch[1],
        confidence: 0.8,
        context: this.getContext(message, amountMatch.index, 25)
      })
    }

    return entities
  }

  /**
   * Get context around a matched entity
   */
  private getContext(text: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius)
    const end = Math.min(text.length, index + radius)
    return text.substring(start, end).trim()
  }

  /**
   * Log chat interaction with extracted entities
   */
  async logChatInteraction(
    message: string, 
    role: 'user' | 'assistant',
    documentReferences: string[] = []
  ): Promise<void> {
    try {
      const extractedEntities = role === 'user' ? this.extractEntities(message) : []
      
      const chatLog: ChatLog = {
        sessionId: this.sessionId,
        message,
        role,
        timestamp: new Date(),
        extractedEntities,
        documentReferences
      }

      // TODO: Send to Supabase when configured
      console.log('Chat log:', chatLog)
      
      // Store locally for now
      this.storeLocally(chatLog)
      
    } catch (error) {
      console.error('Failed to log chat interaction:', error)
    }
  }

  /**
   * Store chat log locally (temporary solution)
   */
  private storeLocally(chatLog: ChatLog): void {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]')
      existingLogs.push(chatLog)
      
      // Keep only last 100 entries
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100)
      }
      
      localStorage.setItem('chatLogs', JSON.stringify(existingLogs))
    } catch (error) {
      console.error('Failed to store chat log locally:', error)
    }
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(): {
    totalMessages: number
    extractedEntities: ExtractedEntity[]
    documentReferences: string[]
    timeline: { timestamp: Date; type: string; content: string }[]
  } {
    try {
      const logs: ChatLog[] = JSON.parse(localStorage.getItem('chatLogs') || '[]')
      const sessionLogs = logs.filter(log => log.sessionId === this.sessionId)
      
      const allEntities = sessionLogs.flatMap(log => log.extractedEntities)
      const allDocuments = Array.from(new Set(sessionLogs.flatMap(log => log.documentReferences)))
      
      const timeline = sessionLogs.map(log => ({
        timestamp: new Date(log.timestamp),
        type: log.role,
        content: log.message.substring(0, 100) + (log.message.length > 100 ? '...' : '')
      }))

      return {
        totalMessages: sessionLogs.length,
        extractedEntities: allEntities,
        documentReferences: allDocuments,
        timeline
      }
    } catch (error) {
      console.error('Failed to get session analytics:', error)
      return {
        totalMessages: 0,
        extractedEntities: [],
        documentReferences: [],
        timeline: []
      }
    }
  }

  /**
   * Generate session summary for AI context
   */
  generateSessionSummary(): string {
    const analytics = this.getSessionAnalytics()
    
    if (analytics.totalMessages === 0) {
      return 'Ny session - ingen tidligere kontext.'
    }

    const entitySummary = analytics.extractedEntities
      .reduce((acc, entity) => {
        if (!acc[entity.type]) acc[entity.type] = []
        acc[entity.type].push(entity.value)
        return acc
      }, {} as Record<string, string[]>)

    let summary = `Session oversigt:\n`
    summary += `- Antal beskeder: ${analytics.totalMessages}\n`
    
    if (Object.keys(entitySummary).length > 0) {
      summary += `- Identificerede oplysninger:\n`
      Object.entries(entitySummary).forEach(([type, values]) => {
        const uniqueValues = Array.from(new Set(values))
        summary += `  • ${type}: ${uniqueValues.join(', ')}\n`
      })
    }
    
    if (analytics.documentReferences.length > 0) {
      summary += `- Refererede dokumenter: ${analytics.documentReferences.join(', ')}\n`
    }

    return summary
  }
} 