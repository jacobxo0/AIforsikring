import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { getUserReports } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Du skal være logget ind for at se rapporter' },
        { status: 401 }
      );
    }

    const reports = await getUserReports(session.user.id);

    const formattedReports = reports.map(report => ({
      id: report.id,
      title: report.title,
      content: report.content?.reportContent || 'Ingen indhold',
      canExport: session.user.subscriptionType === 'premium' || report.paid,
      exportPrice: session.user.subscriptionType === 'premium' ? 0 : 39,
      createdAt: report.created_at,
    }));

    return NextResponse.json({
      success: true,
      reports: formattedReports,
    });

  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: 'Fejl ved hentning af rapporter' },
      { status: 500 }
    );
  }
}