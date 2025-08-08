import { NextRequest, NextResponse } from 'next/server'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
// Dynamic import will be used for pdf-parse to avoid build-time issues

export async function POST(request: NextRequest) {
  try {
    const { documentIds } = await request.json()

    if (!documentIds || documentIds.length < 2) {
      return NextResponse.json(
        { error: 'Mindst 2 dokumenter påkrævet for sammenligning' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API ikke konfigureret' },
        { status: 500 }
      )
    }

    // Extract text from all documents
    const uploadsDir = join(process.cwd(), 'uploads')
    const documents = []

    for (const docId of documentIds) {
      try {
        const filePath = join(uploadsDir, docId + '.pdf')
        const buffer = await readFile(filePath)
        const pdfParse = (await import('pdf-parse')).default
        const pdfData = await pdfParse(buffer)
        
        documents.push({
          id: docId,
          text: pdfData.text,
          pages: pdfData.numpages
        })
      } catch (error) {
        console.error(`Error reading document ${docId}:`, error)
        return NextResponse.json(
          { error: `Kunne ikke læse dokument ${docId}` },
          { status: 404 }
        )
      }
    }

    // Create comparison prompt
    const documentTexts = documents.map((doc, index) => 
      `DOKUMENT ${index + 1} (ID: ${doc.id}):\n${doc.text}\n\n`
    ).join('')

    const systemPrompt = `Du er en dansk forsikringsekspert der sammenligner forsikringspolicer.

Dokumenter til sammenligning:
${documentTexts}

Lav en detaljeret sammenligning der inkluderer:

1. **OVERSIGT**
   - Hvilke typer forsikringer sammenlignes
   - Hovedforskelle mellem policierne

2. **DÆKNING OG YDELSER**
   - Hvad dækker hver police
   - Forskelle i dækningsomfang
   - Begrænsninger og undtagelser

3. **ØKONOMI**
   - Præmier/omkostninger
   - Selvrisiko for hver police
   - Værdi for pengene

4. **VILKÅR OG BETINGELSER**
   - Vigtige forskelle i vilkår
   - Særlige betingelser eller krav

5. **ANBEFALING**
   - Hvilken police er bedst i forskellige situationer
   - Hvem passer hver police bedst til
   - Forbedringsmuligheder

Vær konkret, objektiv og brug danske termer. Fokuser på praktiske forskelle der kan påvirke kundens valg.`

    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Sammenlign disse forsikringspolicer detaljeret.' }
      ],
      temperature: 0.2,
      max_tokens: 3000
    })

    const comparison = completion.choices[0]?.message?.content

    if (!comparison) {
      return NextResponse.json(
        { error: 'Kunne ikke generere sammenligning' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comparison,
      documentsCompared: documents.length,
      documentInfo: documents.map(doc => ({
        id: doc.id,
        pages: doc.pages
      }))
    })

  } catch (error) {
    console.error('Comparison error:', error)
    return NextResponse.json(
      { error: 'Fejl ved sammenligning af dokumenter' },
      { status: 500 }
    )
  }
}

// GET endpoint to list available documents for comparison
export async function GET() {
  try {
    const uploadsDir = join(process.cwd(), 'uploads')
    const files = await readdir(uploadsDir)
    
    const pdfFiles = files
      .filter(file => file.endsWith('.pdf'))
      .map(file => ({
        id: file.replace('.pdf', ''),
        filename: file
      }))

    return NextResponse.json({
      success: true,
      documents: pdfFiles
    })

  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente dokumentliste' },
      { status: 500 }
    )
  }
}