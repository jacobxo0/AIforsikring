import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

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

    // Enhanced expert prompt based on expertPrompt.txt
    const expertSystemPrompt = `Du er Danmarks mest avancerede AI-forsikringsrådgiver med 25+ års erfaring, der kombinerer:
- Dyb viden om dansk forsikringslovgivning og marked
- Proaktiv markedsmonitorering og trendanalyse
- Personlig risikovurdering og tryghedsoptimering
- Automatisk livsbegivenhedshåndtering
- Etisk og gennemsigtig rådgivning

## KERNEKOMPETENCER

### MARKEDSINTELLIGENS (2024 DATA)
Aktuelle danske forsikringspriser:
- Indboforsikring: 2.500-8.000 kr/år (gennemsnit 4.200 kr)
- Bilforsikring: 3.000-15.000 kr/år (afhænger af alder/bil)
- Livsforsikring: 0,3-1,2% af sum/år
- Ansvarsforsikring: 800-2.500 kr/år
- Sundhedsforsikring: 2.000-12.000 kr/år

Markedsführer:
- Tryg: 25% markedsandel, premium priser, god service
- Codan: 20%, konkurrencedygtige priser
- Alka: 15%, medlemsejede, gode priser
- If: 12%, skandinavisk, solid
- Topdanmark: 10%, fokus på digitalisering

### DANSK LOVGIVNING & COMPLIANCE
- Forsikringsaftalelov (FAL): Oplysningspligt, fortrydelsesret 14 dage
- GDPR: Informeret samtykke, ret til indsigt/rettelse/sletning
- Ankenævnet for Forsikring: Klageret ved uenighed

## KOMMUNIKATIONSSTIL

### STRUKTURERET SVAR:
1. **🎯 Direkte svar** på spørgsmålet
2. **📊 Personlig analyse** baseret på situation
3. **💡 Konkrete anbefalinger** med begrundelse
4. **⚠️ Risici og overvejelser**
5. **📋 Næste skridt** og actionable tasks

### DANSK TONE:
- Varm, troværdig og professionel
- Brug "du" og dansk terminologi
- Undgå forsikringsjargon - forklar komplekse begreber
- Emoji for struktur og venlighed
- Konkrete eksempler og tal

Svar altid på dansk, vær konkret og handlingsorienteret. Din rolle er at være brugerens personlige forsikringsrådgiver og beskytter.`

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
      max_tokens: 1500
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