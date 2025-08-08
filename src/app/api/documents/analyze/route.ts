import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
// Dynamic import will be used for pdf-parse to avoid build-time issues

export async function POST(request: NextRequest) {
  try {
    const { documentId, question } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Dokument ID påkrævet' },
        { status: 400 }
      )
    }

    // Find the document file
    const uploadsDir = join(process.cwd(), 'uploads')
    const files = await readFile(join(uploadsDir, documentId + '.pdf'))
    
    // Extract full text from PDF
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(files)
    const documentText = pdfData.text

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API ikke konfigureret' },
        { status: 500 }
      )
    }

    // Use OpenAI to analyze the document
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey })

    const systemPrompt = `Du er en dansk forsikringsekspert der analyserer forsikringsdokumenter. 

Dokument indhold:
${documentText}

Analyser dette dokument og besvar spørgsmål om:
- Forsikringstype og dækning
- Præmier og selvrisiko
- Vilkår og betingelser
- Sammenligninger med andre forsikringer
- Forbedringsforslag

Svar altid på dansk og vær præcis og detaljeret.`

    const userPrompt = question || 'Analyser dette forsikringsdokument og giv mig en detaljeret oversigt over dækningen, præmier og vigtige vilkår.'

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })

    const analysis = completion.choices[0]?.message?.content

    if (!analysis) {
      return NextResponse.json(
        { error: 'Kunne ikke analysere dokumentet' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis,
      documentInfo: {
        pages: pdfData.numpages,
        wordCount: documentText.split(/\s+/).length
      }
    })

  } catch (error) {
    console.error('Document analysis error:', error)
    
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return NextResponse.json(
        { error: 'Dokumentet blev ikke fundet' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Fejl ved analyse af dokument' },
      { status: 500 }
    )
  }
}