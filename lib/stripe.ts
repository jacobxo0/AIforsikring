import Stripe from 'stripe';

// Initialize Stripe only when environment variable is available
export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }
  
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
  });
};

// Export stripe for backwards compatibility
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? getStripe() 
  : null as any;

// Pricing constants
export const PRICES = {
  REPORT_EXPORT: 3900, // 39 DKK in øre
  MONTHLY_SUBSCRIPTION: 14900, // 149 DKK in øre
};

export const PRODUCTS = {
  REPORT_EXPORT: {
    name: 'Sammenligninsrapport Eksport',
    description: 'PDF eksport af detaljeret sammenligninsrapport',
    price: PRICES.REPORT_EXPORT,
  },
  MONTHLY_SUBSCRIPTION: {
    name: 'Premium Abonnement',
    description: 'Ubegrænset adgang til alle premium features',
    price: PRICES.MONTHLY_SUBSCRIPTION,
  },
};

// Create payment intent for one-time payments (report export)
export async function createPaymentIntent(
  amount: number,
  currency: string = 'dkk',
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata,
  });
}

// Create subscription for monthly payments
export async function createSubscription(
  customerId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });
}

// Create or get customer
export async function createOrGetCustomer(
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return await stripe.customers.create({
    email,
    name,
  });
}

// Webhook signature verification
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, secret);
}

// Format price for display
export function formatPrice(amountInOre: number): string {
  const amount = amountInOre / 100;
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
  }).format(amount);
}