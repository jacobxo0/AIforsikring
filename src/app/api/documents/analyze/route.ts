import { NextRequest, NextResponse } from 'next/server'
// Remove filesystem imports - not compatible with Vercel serverless
// import { readFile } from 'fs/promises'
// import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { documentId, question, documentText } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Dokument ID påkrævet' },
        { status: 400 }
      )
    }

    // For Vercel compatibility, we expect documentText to be passed from frontend
    // since we can't store files on filesystem
    if (!documentText) {
      return NextResponse.json(
        { error: 'Dokument tekst ikke tilgængelig. Upload dokumentet igen.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API ikke konfigureret. Kontakt administrator.' },
        { status: 500 }
      )
    }

    // Use OpenAI with enhanced Danish insurance expert prompt
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey })

    // Enhanced expert prompt based on expertPrompt.txt
    const systemPrompt = `Du er Danmarks mest avancerede AI-forsikringsrådgiver med 25+ års erfaring, der kombinerer:
- Dyb viden om dansk forsikringslovgivning og marked
- Proaktiv markedsmonitorering og trendanalyse  
- Personlig risikovurdering og tryghedsoptimering
- Etisk og gennemsigtig rådgivning

DOKUMENT INDHOLD:
${documentText}

Som ekspert skal du analysere dette dokument og:

**📊 PERSONLIG ANALYSE:**
- Identificer forsikringstype og dækningsområder
- Beregn værdi og risikodækning
- Sammenlign med markedsstandard (2024 priser)

**💡 KONKRETE ANBEFALINGER:**
- Optimeringområder for bedre dækning
- Potentielle besparelser
- Risici der ikke er dækket

**⚠️ VIGTIGE OVERVEJELSER:**
- Selvrisiko og begrænsninger
- Udløb og fornyelse
- Klageret og erstatningsprocedure

**📋 HANDLINGSPLAN:**
- Konkrete næste skridt
- Deadlines og frister
- Opfølgning

Svar altid på dansk, vær konkret og handlingsorienteret. Brug emoji til struktur og gør svarene lette at scanne.`

    const userPrompt = question || 'Analyser dette forsikringsdokument grundigt og giv mig en komplet oversigt med anbefalinger og handlingsplan.'

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
        { error: 'Kunne ikke analysere dokumentet. Prøv igen senere.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis,
      documentInfo: {
        documentId,
        wordCount: documentText.split(/\s+/).length,
        analysisDate: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Document analysis error:', error)
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json(
          { error: 'OpenAI API kvote opbrugt. Kontakt administrator.' },
          { status: 500 }
        )
      }
      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          { error: 'Ugyldig OpenAI API nøgle.' },
          { status: 500 }
        )
      }
      if (error.message.includes('model_not_found')) {
        return NextResponse.json(
          { error: 'AI model ikke tilgængelig.' },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { error: `Fejl ved analyse af dokument: ${error instanceof Error ? error.message : 'Ukendt fejl'}` },
      { status: 500 }
    )
  }
}