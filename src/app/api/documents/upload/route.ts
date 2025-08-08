import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Ingen fil uploadet' }, { status: 400 })
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Kun PDF filer er understøttet' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fil er for stor. Maksimum 10MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract text in memory using pdf-parse
    let extractedText = ''
    let pdfPages = 1
    try {
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text || ''
      pdfPages = pdfData.numpages || 1
    } catch (err) {
      console.error('PDF parsing error:', err)
      return NextResponse.json(
        { error: 'Kunne ikke læse PDF indhold. Kontroller at filen er en gyldig PDF.' },
        { status: 500 }
      )
    }

    const analysis = {
      filename: file.name,
      filesize: file.size,
      pages: pdfPages,
      wordCount: extractedText.split(/\s+/).filter((w) => w.length > 0).length,
      hasInsuranceKeywords: /forsikring|police|dækning|selvrisiko|præmie|erstatning|skade|forsikret/i.test(extractedText),
      documentType: detectDocumentType(extractedText),
      extractedText: extractedText.substring(0, 2000),
      fullText: extractedText,
      uploadDate: new Date().toISOString(),
      documentId: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    return NextResponse.json({
      success: true,
      document: { id: analysis.documentId, filename: file.name, analysis },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: `Der opstod en fejl ved upload: ${error instanceof Error ? error.message : 'Ukendt fejl'}` },
      { status: 500 }
    )
  }
}

function detectDocumentType(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('bilforsikring') || t.includes('motorforsikring') || t.includes('køretøj')) return 'Bilforsikring'
  if (t.includes('husejerforsikring') || t.includes('bygningsforsikring') || t.includes('ejerbolig')) return 'Husejerforsikring'
  if (t.includes('indboforsikring') || t.includes('indbo') || t.includes('løsøre')) return 'Indboforsikring'
  if (t.includes('rejseforsikring') || t.includes('ferie') || t.includes('udlandsrejse')) return 'Rejseforsikring'
  if (t.includes('ulykkesforsikring') || t.includes('personskade')) return 'Ulykkesforsikring'
  if (t.includes('livsforsikring') || t.includes('dødsfaldssum')) return 'Livsforsikring'
  if (t.includes('ansvarsforsikring') || t.includes('erstatningsansvar')) return 'Ansvarsforsikring'
  if (t.includes('sundhedsforsikring') || t.includes('sygesikring')) return 'Sundhedsforsikring'
  if (t.includes('police') || t.includes('forsikring')) return 'Forsikringspolice'
  return 'Ukendt dokument'
}