export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { documentIds, documentsPayload } = await request.json()

    if ((!documentIds || documentIds.length < 2) && (!documentsPayload || documentsPayload.length < 2)) {
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

    // Prefer payload from client (fullText) to avoid filesystem usage in serverless
    const docs = (documentsPayload && Array.isArray(documentsPayload) && documentsPayload.length >= 2)
      ? documentsPayload.map((d: any) => ({ id: d.id, text: String(d.fullText || d.text || '') }))
      : []

    if (docs.length < 2) {
      return NextResponse.json(
        { error: 'Dokument tekst mangler. Åbn dokumenterne via /documents og prøv igen.' },
        { status: 400 }
      )
    }

    const documentTexts = docs.map((doc, index) => 
      `DOKUMENT ${index + 1} (ID: ${doc.id}):\n${doc.text.substring(0, 8000)}\n\n`
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
      documentsCompared: docs.length,
      documentInfo: docs.map((doc) => ({ id: doc.id }))
    })

  } catch (error) {
    console.error('Comparison error:', error)
    return NextResponse.json(
      { error: 'Fejl ved sammenligning af dokumenter' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // In serverless, we cannot read local uploads; instruct client to use Documents page state
  return NextResponse.json({ success: true, documents: [] })
}