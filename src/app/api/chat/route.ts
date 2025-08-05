import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/client'

// 🛡️ PRODUCTION-SAFE: Environment-based OpenAI configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_KEY_FALLBACK = process.env.OPENAI_API_KEY_BACKUP

// Safe logger for production
import { logger } from '@/lib/logger';

const safeLogger = {
  error: (message: string, ...args: unknown[]) => {
    try {
      logger.error(message, ...args);
    } catch {
      console.error('[CHAT_API_ERROR]', message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    try {
      logger.warn(message, ...args);
    } catch {
      console.warn('[CHAT_API_WARN]', message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    try {
      logger.info(message, ...args);  
    } catch {
      console.log('[CHAT_API_INFO]', message, ...args);
    }
  }
};

// Create OpenAI client with environment validation
function createOpenAIClient(): OpenAI | null {
  const apiKey = OPENAI_API_KEY || OPENAI_API_KEY_FALLBACK;
  
  if (!apiKey) {
    safeLogger.error('OpenAI API key missing in environment variables');
    return null;
  }
  
  try {
    return new OpenAI({ apiKey });
  } catch (error) {
    safeLogger.error('Failed to initialize OpenAI client:', error);
    return null;
  }
}

// Load the expert prompt
function getExpertPrompt(): string {
  try {
    const promptPath = path.join(process.cwd(), 'prompts', 'expertPrompt.txt')
    return fs.readFileSync(promptPath, 'utf-8')
  } catch (error) {
    console.error('Failed to load expert prompt:', error)
    return 'Du er en hjælpsom dansk forsikringsrådgiver. Svar på dansk og vær præcis og hjælpsom.'
  }
}

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 10 // 10 requests per minute

  const current = rateLimitMap.get(ip)

  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count++
  return true
}

function sanitizeInput(input: string): string {
  // Basic input sanitization
  return input
    .trim()
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
    .substring(0, 4000) // Limit length
}



export async function POST(req: Request) {
  const startTime = Date.now();
  let clientIp = 'unknown';
  
  try {
    // Extract client IP for rate limiting
    clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';

    // Rate limiting check
    if (!checkRateLimit(clientIp)) {
      safeLogger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'For mange forespørgsler. Prøv igen om et minut.',
          retryAfter: 60
        }, 
        { 
          status: 429,
          headers: {
            'Retry-After': '60'
          }
        }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      safeLogger.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Ugyldig request format' }, 
        { status: 400 }
      );
    }

    const { question } = requestBody;

    // Validate input
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Spørgsmål mangler eller er ugyldigt' }, 
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedQuestion = sanitizeInput(question);
    if (sanitizedQuestion.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Spørgsmål er tomt efter rensning' }, 
        { status: 400 }
      );
    }

    // Get OpenAI client
    const openai = createOpenAIClient();
    if (!openai) {
      safeLogger.error('OpenAI client unavailable');
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI-tjeneste midlertidigt utilgængelig. Prøv igen senere.',
          fallback: 'Kontakt kundeservice for direkte hjælp.'
        }, 
        { status: 503 }
      );
    }

    // Generate embeddings with fallback
    let qEmbed: number[];
    try {
      const embedRes = await openai.embeddings.create({
        model: 'text-embedding-3-small', // Updated to newer, cheaper model
        input: sanitizedQuestion,
      });
      qEmbed = embedRes.data[0].embedding;
    } catch (embedError) {
      safeLogger.error('Embedding generation failed:', embedError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Kunne ikke analysere spørgsmål. Prøv igen.',
          fallback: 'Reformuler dit spørgsmål og prøv igen.'
        }, 
        { status: 502 }
      );
    }

    // Search in documents - with database fallback
    let context = '';
    try {
      // Check if Supabase is configured
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const supabase = createClient();
        const { data, error: rpcError } = await supabase
          .rpc('match_embeddings', {
            query_embedding: qEmbed,
            match_count: 3,
          });

        if (rpcError) throw rpcError;
        
        if (data && Array.isArray(data) && data.length > 0) {
          context = data.map((r) => r.chunk || '').filter(Boolean).join('\n---\n');
        }
        
        if (!context) {
          safeLogger.warn('No relevant context found for question');
          context = 'AI bruger sin generelle viden om danske forsikringer.';
        }
      } else {
        // No database - use AI knowledge only
        safeLogger.info('Using AI knowledge without database context');
        context = 'AI bruger sin generelle viden om danske forsikringer uden dokumenter.';
      }
    } catch (supabaseError) {
      safeLogger.warn('Database search not available, using AI knowledge only:', supabaseError);
      context = 'AI bruger sin generelle viden om danske forsikringer.';
    }

    // Generate AI response with fallback
    let answer: string;
    try {
      const expertPrompt = getExpertPrompt();
      
      const chat = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: expertPrompt },
          { 
            role: 'user', 
            content: `Her er uddrag af relevante dokumenter:\n${context}\n\nSpørgsmål: ${sanitizedQuestion}` 
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
      });

      answer = chat.choices[0]?.message?.content?.trim() || 
               'Desværre kunne jeg ikke generere et svar på dit spørgsmål.';
               
    } catch (chatError) {
      safeLogger.error('Chat completion failed:', chatError);
      answer = 'Desværre opstod der en fejl. Prøv at omformulere dit spørgsmål eller kontakt kundeservice.';
    }

    const responseTime = Date.now() - startTime;
    
    safeLogger.info('Chat request completed', {
      ip: clientIp,
      questionLength: sanitizedQuestion.length,
      responseTime,
      hasContext: context.length > 0
    });

    return NextResponse.json({ 
      success: true, 
      answer,
      metadata: {
        responseTime,
        hasContext: context.length > 0,
        contextLength: context.length
      }
    });

  } catch (err: unknown) {
    const responseTime = Date.now() - startTime;
    
    safeLogger.error('Unexpected chat API error:', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      ip: clientIp,
      responseTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Der opstod en uventet fejl. Prøv igen eller kontakt support.',
        errorId: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }, 
      { status: 500 }
    );
  }
}