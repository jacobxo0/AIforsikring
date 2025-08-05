import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAI } from 'openai';

import { logger } from '@/lib/logger';

// Safe logger for production
const safeLogger = {
  error: (message: string, ...args: unknown[]) => {
    try {
      logger.error(message, ...args);
    } catch {
      console.error('[EMBEDDINGS_API_ERROR]', message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    try {
      logger.warn(message, ...args);
    } catch {
      console.warn('[EMBEDDINGS_API_WARN]', message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    try {
      logger.info(message, ...args);
    } catch {
      console.log('[EMBEDDINGS_API_INFO]', message, ...args);
    }
  }
};

// Environment validation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const MAX_CHUNK_SIZE = 8000; // Characters per chunk
const ALLOWED_FILE_TYPES = ['application/pdf'];

// Create OpenAI client with validation
function createOpenAIClient(): OpenAI | null {
  if (!OPENAI_API_KEY) {
    safeLogger.error('OpenAI API key missing in environment');
    return null;
  }
  
  try {
    return new OpenAI({ apiKey: OPENAI_API_KEY });
  } catch (error) {
    safeLogger.error('Failed to initialize OpenAI client:', error);
    return null;
  }
}

// Validate and process file
async function validateAndProcessFile(file: File): Promise<{ buffer: Buffer; text: string }> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Fil er for stor. Maksimum størrelse er ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('Kun PDF-filer er understøttet');
  }
  
  // Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Extract text with fallback
  let text: string;
  try {
    const pdfParse = await import('pdf-parse');
    const pdfData = await pdfParse.default(buffer);
    text = pdfData.text;
  } catch (pdfError) {
    safeLogger.error('PDF parsing failed:', pdfError);
    throw new Error('Kunne ikke læse PDF-fil. Sørg for at filen ikke er krypteret eller beskadiget.');
  }
  
  if (!text || text.trim().length === 0) {
    throw new Error('Ingen tekst fundet i PDF-filen');
  }
  
  return { buffer, text };
}

// Smart text chunking with overlap
function createTextChunks(text: string, maxChunkSize: number = MAX_CHUNK_SIZE): string[] {
  const sentences = text.split(/[.!?]+\s+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    // Check if adding sentence would exceed chunk size
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Start new chunk with overlap (last 200 chars)
        currentChunk = currentChunk.slice(-200) + ' ' + trimmedSentence;
      } else {
        // Single sentence too long - split it
        const longSentenceChunks = trimmedSentence.match(new RegExp(`.{1,${maxChunkSize}}`, 'g')) || [];
        chunks.push(...longSentenceChunks);
        currentChunk = '';
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let uploadedFileName = 'unknown';
  
  try {
    // Get OpenAI client
    const openai = createOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI-tjeneste ikke tilgængelig. Kontakt support.',
          errorCode: 'OPENAI_UNAVAILABLE'
        }, 
        { status: 503 }
      );
    }

    // Parse form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseError) {
      safeLogger.error('Failed to parse form data:', parseError);
      return NextResponse.json(
        { success: false, error: 'Ugyldig fil-upload format' }, 
        { status: 400 }
      );
    }

    // Get file from form data
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Ingen fil uploadet' }, 
        { status: 400 }
      );
    }
    
    uploadedFileName = file.name;
    safeLogger.info('Processing file upload:', { 
      fileName: uploadedFileName, 
      fileSize: file.size,
      fileType: file.type 
    });

    // Validate and process file
    const { text } = await validateAndProcessFile(file);
    
    // Create smart chunks
    const chunks = createTextChunks(text);
    if (chunks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ingen brugbar tekst fundet i filen' }, 
        { status: 400 }
      );
    }

    safeLogger.info(`Created ${chunks.length} chunks from document`);

    // Generate embeddings with batch processing and retries
    const embeddings: Array<{ chunk: string; embedding: number[] }> = [];
    const batchSize = 5; // Process in smaller batches
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      for (const chunk of batch) {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const res = await openai.embeddings.create({
              model: 'text-embedding-3-small', // Fixed model name
              input: chunk,
            });
            
            embeddings.push({ 
              chunk, 
              embedding: res.data[0].embedding 
            });
            break; // Success, exit retry loop
            
          } catch (embeddingError: unknown) {
            retryCount++;
            safeLogger.warn(`Embedding failed for chunk ${i}, retry ${retryCount}:`, embeddingError instanceof Error ? embeddingError.message : String(embeddingError));
            
            if (retryCount >= maxRetries) {
              // Skip this chunk after max retries
              safeLogger.error(`Skipping chunk after ${maxRetries} retries`);
              break;
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        }
      }
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (embeddings.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Kunne ikke generere embeddings. Prøv igen senere.',
          errorCode: 'EMBEDDING_GENERATION_FAILED'
        }, 
        { status: 502 }
      );
    }

    // Save to Supabase with batch inserts and error handling
    let savedCount = 0;
    const insertBatchSize = 10;
    
    for (let i = 0; i < embeddings.length; i += insertBatchSize) {
      const batch = embeddings.slice(i, i + insertBatchSize);
      
      try {
        const { error: insertError } = await supabase
          .from('policy_embeddings')
          .insert(
            batch.map(({ chunk, embedding }) => ({
              chunk,
              embedding,
              created_at: new Date().toISOString(),
              file_name: uploadedFileName
            }))
          );

        if (insertError) {
          safeLogger.error('Supabase insert failed:', insertError);
          // Continue with next batch instead of failing completely
        } else {
          savedCount += batch.length;
        }
      } catch (supabaseError) {
        safeLogger.error('Supabase batch insert error:', supabaseError);
        // Continue processing other batches
      }
    }

    const processingTime = Date.now() - startTime;
    
    safeLogger.info('Embeddings processing completed:', {
      fileName: uploadedFileName,
      totalChunks: chunks.length,
      generatedEmbeddings: embeddings.length,
      savedEmbeddings: savedCount,
      processingTime
    });

    return NextResponse.json({ 
      success: true, 
      count: savedCount,
      totalChunks: chunks.length,
      fileName: uploadedFileName,
      processingTime,
      message: savedCount < embeddings.length ? 
        'Nogle embeddings kunne ikke gemmes. Funktionalitet kan være begrænset.' :
        'Alle embeddings er gemt succesfuldt.'
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    
    safeLogger.error('Embeddings API error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileName: uploadedFileName,
      processingTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Der opstod en fejl ved behandling af filen',
        errorId: `embeddings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: uploadedFileName
      }, 
      { status: 500 }
    );
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload files.' }, 
    { status: 405 }
  );
} 