'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PaywallModal from '../../components/PaywallModal'

interface Report {
  id: string
  title: string
  content: string
  canExport: boolean
  exportPrice: number
  createdAt: string
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session) {
      loadReports()
    }
  }, [session])

  const loadReports = async () => {
    try {
      const response = await fetch('/api/reports')
      const data = await response.json()
      
      if (data.success) {
        setReports(data.reports)
      }
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = (report: Report) => {
    if (!report.canExport) {
      setSelectedReport(report)
      setShowPaywall(true)
    } else {
      // Direct export for premium users
      exportReport(report.id)
    }
  }

  const exportReport = async (reportId: string) => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      })

      const data = await response.json()

      if (data.success) {
        // Generate PDF download
        generatePDF(data.pdf)
      } else if (response.status === 402) {
        // Payment required
        setShowPaywall(true)
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const generatePDF = (pdfData: any) => {
    // Simplified PDF generation - in production use proper PDF library
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${pdfData.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              h1, h2, h3 { color: #1f2937; }
              .watermark { 
                position: fixed; 
                bottom: 20px; 
                right: 20px; 
                color: #9ca3af; 
                font-size: 12px; 
              }
            </style>
          </head>
          <body>
            <h1>${pdfData.title}</h1>
            <div>${pdfData.content.replace(/\n/g, '<br>')}</div>
            ${pdfData.watermark ? `<div class="watermark">${pdfData.watermark}</div>` : ''}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Log ind for at se rapporter</h1>
        <button 
          onClick={() => window.location.href = '/auth/signin'}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          Log ind
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="text-xl">Indlæser rapporter...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📊 Mine Rapporter</h1>
        <p className="text-gray-600">Oversigt over dine genererede sammenligninsrapporter</p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ingen rapporter endnu</h2>
          <p className="text-gray-600 mb-4">
            Generer din første sammenligninsrapport ved at uploade forsikringsdokumenter
          </p>
          <a 
            href="/documents"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📁 Upload Dokumenter
          </a>
        </div>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {report.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Genereret: {new Date(report.createdAt).toLocaleDateString('da-DK')}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  {report.canExport ? (
                    <button
                      onClick={() => handleExport(report)}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      📥 Eksporter PDF
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExport(report)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      🔒 Eksporter ({report.exportPrice} kr)
                    </button>
                  )}
                </div>
              </div>

              <div className="prose max-w-none">
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {report.content.substring(0, 500)}
                    {report.content.length > 500 && '...'}
                  </pre>
                </div>
              </div>

              {!report.canExport && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Premium feature:</strong> Eksporter som PDF for {report.exportPrice} kr 
                    eller få ubegrænset adgang med Premium abonnement
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="PDF Rapport Eksport"
        price={selectedReport?.exportPrice || 39}
        onSuccess={() => {
          if (selectedReport) {
            exportReport(selectedReport.id)
          }
        }}
      />
    </div>
  )
}