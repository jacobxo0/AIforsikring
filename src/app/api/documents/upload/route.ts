import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access, constants } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Safe logger for production
import { logger } from '@/lib/logger';

const safeLogger = {
  error: (message: string, ...args: unknown[]) => {
    try {
      logger.error(message, ...args);
    } catch {
      console.error('[DOCUMENTS_UPLOAD_ERROR]', message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    try {
      logger.warn(message, ...args);
    } catch {
      console.warn('[DOCUMENTS_UPLOAD_WARN]', message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    try {
      logger.info(message, ...args);
    } catch {
      console.log('[DOCUMENTS_UPLOAD_INFO]', message, ...args);
    }
  }
};

// Configuration
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'doc', 'docx'];

// Validate file type and extension
function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `Fil er for stor. Maksimum størrelse er ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }
  
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Filtype ${file.type} er ikke tilladt. Tilladte typer: PDF, billeder, tekst dokumenter`
    };
  }
  
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Filendelse .${extension} er ikke tilladt`
    };
  }
  
  // Check for potentially dangerous filenames
  if (file.name.includes('../') || file.name.includes('..\\') || /[<>:"|?*\x00-\x1f]/.test(file.name)) {
    return {
      isValid: false,
      error: 'Filnavn indeholder ugyldige karakterer'
    };
  }
  
  return { isValid: true };
}

// Create upload directory safely
async function ensureUploadDirectory(uploadDir: string): Promise<boolean> {
  try {
    // Check if directory exists
    await access(uploadDir, constants.F_OK);
    return true;
  } catch {
    // Directory doesn't exist, try to create it
    try {
      await mkdir(uploadDir, { recursive: true });
      safeLogger.info('Created upload directory:', uploadDir);
      return true;
    } catch (createError) {
      safeLogger.error('Failed to create upload directory:', createError);
      return false;
    }
  }
}

// Generate safe filename
function generateSafeFileName(originalName: string): { fileId: string; savedFileName: string } {
  const fileId = randomUUID();
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const safeName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100); // Limit length
  
  return {
    fileId,
    savedFileName: `${fileId}_${safeName}.${extension}`
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let originalFileName = 'unknown';
  let clientIp = 'unknown';
  
  try {
    // Extract client IP for logging
    clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Parse form data with validation
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      safeLogger.error('Failed to parse form data:', parseError);
      return NextResponse.json(
        { error: 'Ugyldig upload format' }, 
        { status: 400 }
      );
    }

    // Get file from form data
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { error: 'Ingen fil uploadet' }, 
        { status: 400 }
      );
    }

    originalFileName = file.name;
    
    safeLogger.info('Processing file upload:', {
      fileName: originalFileName,
      fileSize: file.size,
      fileType: file.type,
      clientIp
    });

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error }, 
        { status: 400 }
      );
    }

    // Generate safe filename
    const { fileId, savedFileName } = generateSafeFileName(originalFileName);
    
    // Prepare upload directory
    const uploadDir = join(process.cwd(), 'uploads');
    const canCreateDir = await ensureUploadDirectory(uploadDir);
    
    let fileSaved = false;
    let savedPath = '';
    
    if (canCreateDir) {
      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Save file to disk
        savedPath = join(uploadDir, savedFileName);
        await writeFile(savedPath, buffer);
        fileSaved = true;
        
        safeLogger.info('File saved to disk:', {
          originalName: originalFileName,
          savedName: savedFileName,
          fileId,
          size: file.size
        });
        
      } catch (saveError) {
        safeLogger.error('Failed to save file to disk:', saveError);
        fileSaved = false;
      }
    }

    const processingTime = Date.now() - startTime;

    // Return success response
    const response = {
      success: true,
      file: {
        id: fileId,
        originalName: originalFileName,
        savedName: fileSaved ? savedFileName : null,
        size: file.size,
        type: file.type,
        savedToDisk: fileSaved
      },
      processingTime,
      message: fileSaved ? 
        'Fil uploadet og gemt succesfuldt' : 
        'Fil uploadet men kunne ikke gemmes permanent'
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    
    safeLogger.error('Document upload error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileName: originalFileName,
      clientIp,
      processingTime
    });

    return NextResponse.json(
      { 
        error: 'Upload fejlede uventet',
        errorId: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: originalFileName,
        suggestion: 'Prøv igen med en mindre fil eller kontakt support'
      }, 
      { status: 500 }
    );
  }
}

// Handle other methods with proper error messages
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed', 
      allowedMethods: ['POST'],
      message: 'Brug POST metode til at uploade filer'
    }, 
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Method not allowed', 
      allowedMethods: ['POST'],
      message: 'Brug POST metode til at uploade filer'
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Method not allowed', 
      allowedMethods: ['POST'],
      message: 'Brug POST metode til at uploade filer'
    }, 
    { status: 405 }
  );
} 