'use client'

import { useState } from 'react'
import { DocumentLoadingSpinner } from './LoadingSpinner'

interface PDFUploadProps {
  onDocumentParsed: (document: { name: string; content: string; type: string }) => void
}

export default function PDFUpload({ onDocumentParsed }: PDFUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('Filen er for stor. Maksimal størrelse er 10MB.')
      event.target.value = ''
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      let content = ''

      if (file.type === 'application/pdf') {
        // TODO: Implement server-side PDF parsing
        content = `[PDF Dokument: ${file.name}]\nDette er en PDF fil. Indhold vil blive behandlet når backend PDF parsing er implementeret.\n\nFilstørrelse: ${(file.size / 1024 / 1024).toFixed(2)} MB`
      } else if (file.type === 'text/plain') {
        // Handle text files
        content = await file.text()
        if (content.length > 50000) {
          content = content.substring(0, 50000) + '\n\n[Tekst afkortet - for lang til visning]'
        }
      } else if (file.type.startsWith('image/')) {
        // TODO: Implement OCR with Tesseract.js
        content = `[Billede: ${file.name}]\nDette er et billede. OCR behandling vil blive implementeret for at udtrække tekst.\n\nFilstørrelse: ${(file.size / 1024 / 1024).toFixed(2)} MB`
      } else {
        throw new Error('Ikke-understøttet filtype. Upload venligst PDF, tekst eller billede filer.')
      }

      // Determine document type based on content analysis
      const documentType = analyzeDocumentType(file.name, content)

      onDocumentParsed({
        name: file.name,
        content,
        type: documentType
      })

    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Der opstod en fejl ved upload')
    } finally {
      setIsUploading(false)
      // Reset input
      event.target.value = ''
    }
  }

  const analyzeDocumentType = (filename: string, content: string): string => {
    const lower = filename.toLowerCase() + ' ' + content.toLowerCase()

    if (lower.includes('police') || lower.includes('forsikring') || lower.includes('dækning')) {
      return 'insurance_policy'
    } else if (lower.includes('skade') || lower.includes('anmeldelse') || lower.includes('erstatning')) {
      return 'claim_document'
    } else if (lower.includes('korrespondance') || lower.includes('brev') || lower.includes('mail')) {
      return 'correspondence'
    } else {
      return 'general_document'
    }
  }

  if (isUploading) {
    return (
      <div className="border-2 border-dashed border-insurance-blue rounded-lg p-6">
        <DocumentLoadingSpinner />
      </div>
    )
  }

  return (
    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
      uploadError
        ? 'border-red-300 bg-red-50'
        : 'border-gray-300 hover:border-insurance-blue'
    }`}>
      <div className="space-y-4">
        <div className={`mx-auto w-12 h-12 ${
          uploadError ? 'text-red-400' : 'text-gray-400'
        }`}>
          {uploadError ? (
            <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              />
            </svg>
          )}
        </div>

        <div>
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className={`text-sm font-medium hover:opacity-80 ${
              uploadError
                ? 'text-red-600'
                : 'text-insurance-blue hover:text-insurance-dark'
            }`}>
              {uploadError ? 'Prøv igen' : 'Upload forsikringsdokument'}
            </span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept=".pdf,.txt,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
          <p className="text-xs text-gray-500 mt-1">
            PDF, tekst eller billede filer op til 10MB
          </p>
        </div>

        {isUploading && (
          <div className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-4 w-4 text-insurance-blue" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-gray-600">Behandler dokument...</span>
          </div>
        )}

        {uploadError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {uploadError}
          </div>
        )}
      </div>
    </div>
  )
}