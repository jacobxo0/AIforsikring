import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canExportReports } from '../../../../../lib/auth';
import { getUserReports } from '../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Du skal være logget ind for at eksportere rapporter' },
        { status: 401 }
      );
    }

    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json(
        { error: 'Rapport ID påkrævet' },
        { status: 400 }
      );
    }

    // Check if user can export reports
    if (!canExportReports(session.user)) {
      return NextResponse.json(
        { 
          error: 'Du skal have premium adgang eller købe eksport for at downloade PDF',
          requiresPayment: true,
          price: 39
        },
        { status: 402 } // Payment required
      );
    }

    // Get user's reports
    const userReports = await getUserReports(session.user.id);
    const report = userReports.find(r => r.id === reportId);

    if (!report) {
      return NextResponse.json(
        { error: 'Rapport ikke fundet' },
        { status: 404 }
      );
    }

    // For premium users or paid reports, allow export
    if (session.user.subscriptionType === 'premium' || report.paid) {
      // Generate PDF content (simplified for now - in production use proper PDF generation)
      const pdfContent = {
        title: report.title,
        content: report.content,
        exportedAt: new Date().toISOString(),
        watermark: session.user.subscriptionType === 'free' ? 'Eksporteret via AI Forsikringsguiden' : null,
      };

      return NextResponse.json({
        success: true,
        pdf: pdfContent,
        downloadUrl: `/api/reports/download/${reportId}`,
      });
    }

    return NextResponse.json(
      { 
        error: 'Betaling påkrævet for at eksportere rapport',
        requiresPayment: true,
        price: 39
      },
      { status: 402 }
    );

  } catch (error) {
    console.error('Export report error:', error);
    return NextResponse.json(
      { error: 'Fejl ved eksport af rapport' },
      { status: 500 }
    );
  }
}