import { NextRequest, NextResponse } from 'next/server'
// Remove filesystem imports - not needed for Vercel serverless
// import { writeFile, mkdir } from 'fs/promises'
// import { join } from 'path'
// import { existsSync } from 'fs'
// Dynamic import will be used for pdf-parse to avoid build-time issues

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Ingen fil uploadet' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Kun PDF filer er understøttet' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fil er for stor. Maksimum 10MB' },
        { status: 400 }
      )
    }

    // Process file in memory (Vercel-compatible)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract text from PDF
    let extractedText = ''
    let pdfPages = 1
    try {
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text
      pdfPages = pdfData.numpages || 1
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError)
      return NextResponse.json(
        { error: 'Kunne ikke læse PDF indhold. Kontroller at filen er en gyldig PDF.' },
        { status: 500 }
      )
    }

    // Enhanced analysis of the document
    const analysis = {
      filename: file.name,
      filesize: file.size,
      pages: pdfPages,
      wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length,
      hasInsuranceKeywords: /forsikring|police|dækning|selvrisiko|præmie|erstatning|skade|forsikret/i.test(extractedText),
      documentType: detectDocumentType(extractedText),
      extractedText: extractedText.substring(0, 2000), // Preview text
      fullText: extractedText, // Store full text for analysis
      uploadDate: new Date().toISOString(),
      documentId: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    return NextResponse.json({
      success: true,
      document: {
        id: analysis.documentId,
        filename: file.name,
        analysis
      }
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
  const lowercaseText = text.toLowerCase()
  
  // Enhanced detection with more keywords
  if (lowercaseText.includes('bilforsikring') || lowercaseText.includes('motorforsikring') || lowercaseText.includes('køretøj')) {
    return 'Bilforsikring'
  }
  if (lowercaseText.includes('husejerforsikring') || lowercaseText.includes('bygningsforsikring') || lowercaseText.includes('ejerbolig')) {
    return 'Husejerforsikring'
  }
  if (lowercaseText.includes('indboforsikring') || lowercaseText.includes('indbo') || lowercaseText.includes('løsøre')) {
    return 'Indboforsikring'
  }
  if (lowercaseText.includes('rejseforsikring') || lowercaseText.includes('ferie') || lowercaseText.includes('udlandsrejse')) {
    return 'Rejseforsikring'
  }
  if (lowercaseText.includes('ulykkesforsikring') || lowercaseText.includes('personskade')) {
    return 'Ulykkesforsikring'
  }
  if (lowercaseText.includes('livsforsikring') || lowercaseText.includes('dødsfaldssum')) {
    return 'Livsforsikring'
  }
  if (lowercaseText.includes('ansvarsforsikring') || lowercaseText.includes('erstatningsansvar')) {
    return 'Ansvarsforsikring'
  }
  if (lowercaseText.includes('sundhedsforsikring') || lowercaseText.includes('sygesikring')) {
    return 'Sundhedsforsikring'
  }
  if (lowercaseText.includes('police') || lowercaseText.includes('forsikring')) {
    return 'Forsikringspolice'
  }
  
  return 'Ukendt dokument'
}