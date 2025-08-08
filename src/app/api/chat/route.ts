import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API nøgle ikke konfigureret' },
        { status: 500 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Besked er påkrævet' },
        { status: 400 }
      )
    }

    // Dynamic import to avoid bundling when key is absent
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du er en dansk AI-assistent specialiseret i forsikringsrådgivning. 
          Du hjælper med:
          - Forsikringsrådgivning og -sammenligning
          - Forklaring af forsikringsvilkår
          - Hjælp med skadeanmeldelser
          - Juridisk vejledning inden for forsikring
          
          Svar altid på dansk og vær professionel og hjælpsom.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const reply = completion.choices[0]?.message?.content

    if (!reply) {
      return NextResponse.json(
        { error: 'Ingen respons fra AI' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reply })

  } catch (error) {
    console.error('Chat API fejl:', error)
    
    // More specific error handling for OpenAI API
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
      { error: `Der opstod en intern serverfejl: ${error instanceof Error ? error.message : 'Ukendt fejl'}` },
      { status: 500 }
    )
  }
}