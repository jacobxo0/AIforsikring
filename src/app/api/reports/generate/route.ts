export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { createReport } from '../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Du skal være logget ind for at generere rapporter' },
        { status: 401 }
      );
    }

    const { documentIds, comparisonData } = await request.json();

    if (!documentIds || documentIds.length < 2) {
      return NextResponse.json(
        { error: 'Mindst 2 dokumenter påkrævet for sammenligning' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service ikke tilgængelig' },
        { status: 500 }
      );
    }

    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey });

    const reportPrompt = `Som ekspert forsikringsrådgiver skal du lave en komplet sammenligninsrapport baseret på følgende forsikringsdokumenter:

${comparisonData.map((doc: any, index: number) => 
  `DOKUMENT ${index + 1}: ${doc.filename}
Indhold: ${doc.content.substring(0, 2000)}...

`).join('')}

LAV EN PROFESSIONEL RAPPORT MED:

## 🏢 EXECUTIVE SUMMARY
- Kort opsummering af de sammenlignede forsikringer
- Hovedkonklusioner og anbefalinger

## 📊 DETALJERET SAMMENLIGNING

### Dækning og Ydelser
- Sammenlign alle dækningsområder
- Identificer gaps og overlap
- Vurder dækningskvalitet

### Økonomisk Analyse  
- Præmiesammenligning (årligt/månedligt)
- Selvrisiko analyse
- Værdi-for-penge vurdering
- Potentielle besparelser

### Vilkår og Betingelser
- Vigtige forskelle i vilkår
- Begrænsninger og undtagelser
- Opsigelsesvilkår

## 🎯 ANBEFALINGER
- Hvilken forsikring er bedst samlet set
- Specifikke anbefalinger baseret på profil
- Handlingsplan og næste skridt

## ⚠️ VIGTIGE OVERVEJELSER
- Risici ved skift
- Timingövervejelser
- Juridiske aspekter

Lav rapporten professionel, detaljeret og brugbar til beslutningstagning.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Du er Danmarks førende forsikringsekspert der laver professionelle sammenligninsrapporter.' },
        { role: 'user', content: reportPrompt }
      ],
      temperature: 0.2,
      max_tokens: 3000
    });

    const reportContent = completion.choices[0]?.message?.content;

    if (!reportContent) {
      return NextResponse.json(
        { error: 'Kunne ikke generere rapport' },
        { status: 500 }
      );
    }

    const report = await createReport(
      session.user.id,
      `Sammenligninsrapport - ${new Date().toLocaleDateString('da-DK')}`,
      {
        documentIds,
        reportContent,
        comparisonData,
        generatedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        content: reportContent,
        canExport: session.user.subscriptionType === 'premium',
        exportPrice: session.user.subscriptionType === 'free' ? 39 : 0,
      }
    });

  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { error: 'Fejl ved generering af rapport' },
      { status: 500 }
    );
  }
}