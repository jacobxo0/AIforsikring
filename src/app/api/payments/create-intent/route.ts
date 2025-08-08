import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { createPaymentIntent, PRICES } from '../../../../../lib/stripe';
import { createTransaction } from '../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Du skal være logget ind for at foretage betaling' },
        { status: 401 }
      );
    }

    const { type, reportId } = await request.json();

    if (type !== 'report_export') {
      return NextResponse.json(
        { error: 'Ugyldig betalingstype' },
        { status: 400 }
      );
    }

    const amount = PRICES.REPORT_EXPORT;
    
    // Create payment intent with Stripe
    const paymentIntent = await createPaymentIntent(amount, 'dkk', {
      type,
      reportId: reportId || '',
      userEmail: session.user.email,
    });

    // Create transaction in our database
    await createTransaction(
      session.user.id,
      'report_export',
      amount,
      paymentIntent.id
    );

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount,
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    return NextResponse.json(
      { error: 'Der opstod en fejl ved oprettelse af betaling' },
      { status: 500 }
    );
  }
}