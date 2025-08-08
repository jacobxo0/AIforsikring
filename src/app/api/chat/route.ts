import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, canAccessAdvancedFeatures } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body
    
    // Get user session for freemium limitations
    const session = await getServerSession(authOptions)

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API nøgle ikke konfigureret. Kontakt administrator.' },
        { status: 500 }
      )
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Besked er påkrævet og skal være en ikke-tom tekst.' },
        { status: 400 }
      )
    }

    // Dynamic import to avoid bundling when key is absent
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey })

    // Check if user has access to advanced features
    const hasAdvancedAccess = canAccessAdvancedFeatures(session?.user)
    
    // Enhanced expert prompt based on subscription level
    const expertSystemPrompt = hasAdvancedAccess 
      ? `Du er Danmarks mest avancerede AI-forsikringsrådgiver med 25+ års erfaring. Svar udførligt og detaljeret med markedsdata og konkrete anbefalinger. Svar altid på dansk.` 
      : `Du er en dansk AI-forsikringsrådgiver der hjælper med grundlæggende spørgsmål. 

BEGRÆNSNINGER FOR GRATIS BRUGERE:
- Giv korte svar (max 300 ord)
- Grundlæggende rådgivning kun
- Nævn premium features for avanceret hjælp

Svar altid på dansk og vær hjælpsom.`

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: expertSystemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: hasAdvancedAccess ? 1500 : 500, // Limit tokens for free users
    })

    const reply = completion.choices[0]?.message?.content

    if (!reply) {
      return NextResponse.json(
        { error: 'Ingen respons fra AI. Prøv igen senere.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reply })

  } catch (error) {
    console.error('Chat API fejl:', error)
    
    // Enhanced error handling for OpenAI API
    if (error instanceof Error) {
      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json(
          { error: 'OpenAI API kvote opbrugt. Kontakt administrator.' },
          { status: 500 }
        )
      }
      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          { error: 'Ugyldig OpenAI API nøgle. Tjek miljøvariabler.' },
          { status: 500 }
        )
      }
      if (error.message.includes('model_not_found')) {
        return NextResponse.json(
          { error: 'AI model ikke tilgængelig.' },
          { status: 500 }
        )
      }
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'For mange forespørgsler. Vent et øjeblik og prøv igen.' },
          { status: 429 }
        )
      }
    }
    
    return NextResponse.json(
      { error: `Der opstod en intern serverfejl: ${error instanceof Error ? error.message : 'Ukendt fejl'}` },
      { status: 500 }
    )
  }
}