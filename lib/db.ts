import { sql } from '@vercel/postgres';

// Database connection helper
export async function query(text: string, params?: any[]) {
  try {
    const result = await sql.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// User management
export interface User {
  id: string;
  email: string;
  subscription_type: 'free' | 'premium';
  credits: number;
  created_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'report_export' | 'subscription';
  amount: number; // øre
  status: 'pending' | 'completed' | 'failed';
  stripe_payment_intent_id?: string;
  created_at: Date;
}

export interface Report {
  id: string;
  user_id: string;
  title: string;
  content: any; // JSONB
  exported_at?: Date;
  paid: boolean;
  created_at: Date;
}

// User functions
export async function createUser(email: string): Promise<User> {
  const result = await sql`
    INSERT INTO users (email)
    VALUES (${email})
    RETURNING *
  `;
  return result.rows[0] as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return result.rows[0] as User || null;
}

export async function updateUserSubscription(userId: string, subscriptionType: 'free' | 'premium'): Promise<void> {
  await sql`
    UPDATE users 
    SET subscription_type = ${subscriptionType}
    WHERE id = ${userId}
  `;
}

export async function getUserUsage(userId: string): Promise<{
  documentsUploaded: number;
  reportsGenerated: number;
}> {
  const documentsResult = await sql`
    SELECT COUNT(*) as count FROM user_sessions 
    WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '24 hours'
  `;
  
  const reportsResult = await sql`
    SELECT COUNT(*) as count FROM reports 
    WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '30 days'
  `;

  return {
    documentsUploaded: parseInt(documentsResult.rows[0]?.count || '0'),
    reportsGenerated: parseInt(reportsResult.rows[0]?.count || '0')
  };
}

// Transaction functions
export async function createTransaction(
  userId: string,
  type: 'report_export' | 'subscription',
  amount: number,
  stripePaymentIntentId?: string
): Promise<Transaction> {
  const result = await sql`
    INSERT INTO transactions (user_id, type, amount, stripe_payment_intent_id)
    VALUES (${userId}, ${type}, ${amount}, ${stripePaymentIntentId})
    RETURNING *
  `;
  return result.rows[0] as Transaction;
}

export async function updateTransactionStatus(
  transactionId: string,
  status: 'completed' | 'failed'
): Promise<void> {
  await sql`
    UPDATE transactions 
    SET status = ${status}
    WHERE id = ${transactionId}
  `;
}

// Report functions
export async function createReport(
  userId: string,
  title: string,
  content: any
): Promise<Report> {
  const result = await sql`
    INSERT INTO reports (user_id, title, content)
    VALUES (${userId}, ${title}, ${content})
    RETURNING *
  `;
  return result.rows[0] as Report;
}

export async function markReportAsPaid(reportId: string): Promise<void> {
  await sql`
    UPDATE reports 
    SET paid = TRUE, exported_at = NOW()
    WHERE id = ${reportId}
  `;
}

export async function getUserReports(userId: string): Promise<Report[]> {
  const result = await sql`
    SELECT * FROM reports 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result.rows as Report[];
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        subscription_type VARCHAR(50) DEFAULT 'free',
        credits INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        amount INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        stripe_payment_intent_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Reports table
    await sql`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content JSONB,
        exported_at TIMESTAMP,
        paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // User sessions for tracking usage
    await sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        session_data JSONB,
        documents_uploaded INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}