import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const filename = `${Date.now()}-${file.name}`
    const filepath = join(uploadsDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Extract text from PDF
    let extractedText = ''
    try {
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError)
      return NextResponse.json(
        { error: 'Kunne ikke læse PDF indhold' },
        { status: 500 }
      )
    }

    // Basic analysis of the document
    const analysis = {
      filename,
      filesize: file.size,
      pages: extractedText.split('\f').length,
      wordCount: extractedText.split(/\s+/).length,
      hasInsuranceKeywords: /forsikring|police|dækning|selvrisiko|præmie/i.test(extractedText),
      documentType: detectDocumentType(extractedText),
      extractedText: extractedText.substring(0, 1000) // First 1000 chars for preview
    }

    return NextResponse.json({
      success: true,
      document: {
        id: filename.split('.')[0],
        filename,
        analysis
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Der opstod en fejl ved upload' },
      { status: 500 }
    )
  }
}

function detectDocumentType(text: string): string {
  const lowercaseText = text.toLowerCase()
  
  if (lowercaseText.includes('bilforsikring') || lowercaseText.includes('motorforsikring')) {
    return 'Bilforsikring'
  }
  if (lowercaseText.includes('husejerforsikring') || lowercaseText.includes('bygningsforsikring')) {
    return 'Husejerforsikring'
  }
  if (lowercaseText.includes('indboforsikring') || lowercaseText.includes('indbo')) {
    return 'Indboforsikring'
  }
  if (lowercaseText.includes('rejseforsikring')) {
    return 'Rejseforsikring'
  }
  if (lowercaseText.includes('ulykkesforsikring')) {
    return 'Ulykkesforsikring'
  }
  if (lowercaseText.includes('livsforsikring')) {
    return 'Livsforsikring'
  }
  if (lowercaseText.includes('police') || lowercaseText.includes('forsikring')) {
    return 'Forsikringspolice'
  }
  
  return 'Ukendt dokument'
}