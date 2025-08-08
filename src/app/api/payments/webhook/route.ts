import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { constructWebhookEvent } from '../../../../../lib/stripe';
import { updateTransactionStatus, markReportAsPaid, updateUserSubscription } from '../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = constructWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Update transaction status
        await updateTransactionStatus(paymentIntent.id, 'completed');
        
        // If it's a report export, mark report as paid
        if (paymentIntent.metadata.type === 'report_export' && paymentIntent.metadata.reportId) {
          await markReportAsPaid(paymentIntent.metadata.reportId);
        }
        
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await updateTransactionStatus(failedPayment.id, 'failed');
        console.log(`Payment failed: ${failedPayment.id}`);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        
        if (subscription.status === 'active') {
          // Update user to premium subscription
          // We'd need to store customer ID to user mapping
          console.log(`Subscription active: ${subscription.id}`);
        }
        break;

      case 'customer.subscription.deleted':
        const cancelledSubscription = event.data.object;
        console.log(`Subscription cancelled: ${cancelledSubscription.id}`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}