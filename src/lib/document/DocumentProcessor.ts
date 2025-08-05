import { createWorker } from 'tesseract.js'
import { createClient } from '@/lib/supabase/client'
import OpenAI from 'openai'

interface ExtractedMetadata {
  documentType: string
  confidence: number
  entities: {
    policyNumber?: string
    insuranceCompany?: string
    coverageAmount?: number
    deductible?: number
    policyDates?: {
      start?: string
      end?: string
      renewal?: string
    }
    names?: string[]
    addresses?: string[]
    amounts?: Array<{ amount: number; currency: string; context: string }>
    dates?: Array<{ date: string; context: string }>
  }
  keyPhrases: string[]
  summary: string
}

interface ProcessedDocument {
  id: string
  content: string
  metadata: ExtractedMetadata
  documentType: string
  processingStatus: 'completed' | 'failed'
  error?: string
}

export class DocumentProcessor {
  private openai: OpenAI
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    })
    this.supabase = createClient()
  }

  async processDocument(file: File, userId: string): Promise<ProcessedDocument> {
    try {
      // Step 1: Extract text content
      let content = ''
      if (file.type === 'application/pdf') {
        content = await this.extractFromPDF(file)
      } else if (file.type === 'text/plain') {
        content = await file.text()
      } else if (file.type.startsWith('image/')) {
        content = await this.extractFromImage(file)
      } else {
        throw new Error('Unsupported file type')
      }

      // Step 2: Classify document type
      const documentType = await this.classifyDocument(content, file.name)

      // Step 3: Extract metadata and entities
      const metadata = await this.extractMetadata(content, documentType)

      // Step 4: Store in database
      const { data, error } = await this.supabase
        .from('documents')
        .insert({
          user_id: userId,
          filename: this.generateFilename(file.name),
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          content,
          document_type: documentType as string,
          classification_confidence: metadata.confidence,
          metadata: metadata as unknown as Record<string, unknown>,
          processing_status: 'completed'
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: data.id,
        content,
        metadata,
        documentType,
        processingStatus: 'completed'
      }

    } catch (error) {
      console.error('Document processing error:', error)

      // Store failed processing attempt
      await this.supabase
        .from('documents')
        .insert({
          user_id: userId,
          filename: this.generateFilename(file.name),
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          processing_status: 'failed',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        })

      return {
        id: '',
        content: '',
        metadata: {} as ExtractedMetadata,
        documentType: 'general_document',
        processingStatus: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async extractFromPDF(file: File): Promise<string> {
    // For now, return placeholder - in production you'd use pdf-parse on server side
    // This would require implementing a server-side API endpoint
    return `[PDF Dokument: ${file.name}]\n\nDette PDF dokument vil blive behandlet når server-side PDF parsing er implementeret.\n\nPDF parsing kræver server-side behandling for at fungere korrekt med Tesseract.js integration.`
  }

  private async extractFromImage(file: File): Promise<string> {
    try {
      const worker = await createWorker('dan', 1, {
        logger: (m: any) => console.log(m) // Optional logging
      })

      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      return text
    } catch (error) {
      console.error('OCR processing error:', error)
      throw new Error('Failed to extract text from image')
    }
  }

  private async classifyDocument(content: string, filename: string): Promise<string> {
    try {
      const prompt = `
Klassificer dette dokument baseret på indhold og filnavn.

Filnavn: ${filename}
Indhold: ${content.substring(0, 2000)}

Returner KUN en af disse kategorier:
- insurance_policy (forsikringspolice)
- claim_document (skadeanmeldelse)
- correspondence (korrespondance)
- legal_document (juridisk dokument)
- general_document (generelt dokument)

Kategorisering:`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 50
      })

      const classification = response.choices[0]?.message?.content?.trim().toLowerCase()

      // Validate classification
      const validTypes = ['insurance_policy', 'claim_document', 'correspondence', 'legal_document', 'general_document']
      return validTypes.includes(classification || '') ? classification! : 'general_document'

    } catch (error) {
      console.error('Document classification error:', error)
      return 'general_document'
    }
  }

  private async extractMetadata(content: string, documentType: string): Promise<ExtractedMetadata> {
    try {
      const prompt = `
Analyser dette danske forsikringsdokument og udtrækker struktureret metadata.

Dokumenttype: ${documentType}
Indhold: ${content}

Returner metadata i dette JSON format:
{
  "documentType": "${documentType}",
  "confidence": 0.95,
  "entities": {
    "policyNumber": "police nummer hvis fundet",
    "insuranceCompany": "forsikringsselskabets navn",
    "coverageAmount": 0,
    "deductible": 0,
    "policyDates": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "renewal": "YYYY-MM-DD"
    },
    "names": ["person navne"],
    "addresses": ["adresser"],
    "amounts": [{"amount": 0, "currency": "DKK", "context": "beskrivelse"}],
    "dates": [{"date": "YYYY-MM-DD", "context": "beskrivelse"}]
  },
  "keyPhrases": ["vigtige nøgleord og fraser"],
  "summary": "Kort sammenfatning af dokumentet på dansk"
}

Metadata:`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000
      })

      const metadataText = response.choices[0]?.message?.content
      if (!metadataText) {
        throw new Error('No metadata extracted')
      }

      try {
        return JSON.parse(metadataText) as ExtractedMetadata
      } catch {
        // If JSON parsing fails, create basic metadata
        return {
          documentType,
          confidence: 0.5,
          entities: {},
          keyPhrases: this.extractKeyPhrases(content),
          summary: content.substring(0, 200) + '...'
        }
      }

    } catch (error) {
      console.error('Metadata extraction error:', error)
      return {
        documentType,
        confidence: 0.3,
        entities: {},
        keyPhrases: this.extractKeyPhrases(content),
        summary: content.substring(0, 200) + '...'
      }
    }
  }

  private extractKeyPhrases(content: string): string[] {
    // Simple keyword extraction for Danish insurance terms
    const insuranceTerms = [
      'forsikring', 'police', 'dækning', 'selvrisiko', 'præmie',
      'skade', 'erstatning', 'ansvar', 'kasko', 'indboforsikring',
      'bilforsikring', 'husejerforsikring', 'rejseforsikring',
      'vandskade', 'brand', 'tyveri', 'påkørsel', 'storm'
    ]

    const words = content.toLowerCase().split(/\s+/)
    const foundTerms = insuranceTerms.filter(term =>
      words.some(word => word.includes(term))
    )

    return foundTerms.slice(0, 10) // Return top 10 terms
  }

  private generateFilename(originalName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const extension = originalName.split('.').pop()
    const baseName = originalName.replace(/\.[^/.]+$/, '')
    return `${baseName}_${timestamp}.${extension}`
  }

  // Get documents for a user with full metadata
  async getUserDocuments(userId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user documents:', error)
      return []
    }

    return data || []
  }

  // Search documents by content
  async searchDocuments(userId: string, query: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .textSearch('content', query)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching documents:', error)
      return []
    }

    return data || []
  }

  // Delete document
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('documents')
      .update({ is_active: false })
      .eq('id', documentId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting document:', error)
      return false
    }

    return true
  }

  // Get document insights for AI context
  async getDocumentInsights(documentIds: string[]): Promise<string> {
    if (documentIds.length === 0) return ''

    const { data, error } = await this.supabase
      .from('documents')
      .select('filename, document_type, metadata, content')
      .in('id', documentIds)
      .eq('is_active', true)

    if (error || !data) return ''

    let insights = '## BRUGERENS DOKUMENTER\n\n'

    data.forEach((doc, index) => {
      insights += `### Dokument ${index + 1}: ${doc.filename}\n`
      insights += `**Type:** ${doc.document_type}\n`

      if (doc.metadata && typeof doc.metadata === 'object') {
        const metadata = doc.metadata as Record<string, unknown>
        if (metadata.summary) {
          insights += `**Sammenfatning:** ${metadata.summary}\n`
        }
        if (metadata.entities && typeof metadata.entities === 'object') {
          const entities = metadata.entities as Record<string, unknown>
          if (entities.policyNumber) {
            insights += `**Policenummer:** ${entities.policyNumber}\n`
          }
          if (entities.insuranceCompany) {
            insights += `**Selskab:** ${entities.insuranceCompany}\n`
          }
        }
      }

      insights += `**Indhold (excerpt):** ${doc.content?.substring(0, 300)}...\n\n`
    })

    return insights
  }
}