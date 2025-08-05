/**
 * Session management for AI Forsikringsguiden
 * Formål: Hent sessionId fra Supabase JWT og håndter session state
 * Kilder: Supabase authentication, NextJS middleware
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logger } from './logger';

/**
 * Session information interface
 */
export interface SessionInfo {
  sessionId: string | null;
  userId: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  expiresAt: Date | null;
}

/**
 * Extract session ID from Supabase JWT token
 * @param request - NextRequest object containing headers
 * @returns Session ID or null if not found/invalid
 */
export async function getSessionId(request: NextRequest): Promise<string | null> {
  try {
    const cookieStore = request.cookies;
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      logger.debug({ error: error.message }, 'Failed to get session from Supabase');
      return null;
    }

    if (!session) {
      return null;
    }

    const sessionId = generateSessionId(session.user.id, session.access_token);
    return sessionId;

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 'Error extracting session ID');
    return null;
  }
}

/**
 * Get comprehensive session information
 * @param request - NextRequest object
 * @returns Complete session information
 */
export async function getSessionInfo(request: NextRequest): Promise<SessionInfo> {
  try {
    const cookieStore = request.cookies;
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return {
        sessionId: null,
        userId: null,
        userEmail: null,
        isAuthenticated: false,
        expiresAt: null
      };
    }

    const sessionId = generateSessionId(session.user.id, session.access_token);

    return {
      sessionId,
      userId: session.user.id,
      userEmail: session.user.email || null,
      isAuthenticated: true,
      expiresAt: new Date(session.expires_at! * 1000)
    };

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 'Error getting session info');
    
    return {
      sessionId: null,
      userId: null,
      userEmail: null,
      isAuthenticated: false,
      expiresAt: null
    };
  }
}

/**
 * Generate a consistent session ID from user ID and access token
 * @param userId - User ID from Supabase
 * @param accessToken - JWT access token
 * @returns Generated session ID
 */
function generateSessionId(userId: string, accessToken: string): string {
  const tokenHash = hashString(accessToken);
  return `${userId.slice(0, 8)}-${tokenHash.slice(-8)}`;
}

/**
 * Simple hash function for generating consistent IDs
 * @param str - String to hash
 * @returns Hashed string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Check if session is valid and not expired
 * @param sessionInfo - Session information to validate
 * @returns True if session is valid
 */
export function isSessionValid(sessionInfo: SessionInfo): boolean {
  if (!sessionInfo.isAuthenticated || !sessionInfo.expiresAt) {
    return false;
  }

  return new Date() < sessionInfo.expiresAt;
}

/**
 * Extract session from server components (using cookies)
 * @returns Session information for server components
 */
export async function getServerSession(): Promise<SessionInfo> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return {
        sessionId: null,
        userId: null,
        userEmail: null,
        isAuthenticated: false,
        expiresAt: null
      };
    }

    const sessionId = generateSessionId(session.user.id, session.access_token);

    return {
      sessionId,
      userId: session.user.id,
      userEmail: session.user.email || null,
      isAuthenticated: true,
      expiresAt: new Date(session.expires_at! * 1000)
    };

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 'Error getting server session');
    
    return {
      sessionId: null,
      userId: null,
      userEmail: null,
      isAuthenticated: false,
      expiresAt: null
    };
  }
}

/**
 * Middleware helper to add session context to request
 * @param request - NextRequest to enhance
 * @returns Enhanced request with session info
 */
export async function enhanceRequestWithSession(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  
  // Add session info to request headers for downstream use
  if (sessionInfo.sessionId) {
    request.headers.set('x-session-id', sessionInfo.sessionId);
  }
  
  if (sessionInfo.userId) {
    request.headers.set('x-user-id', sessionInfo.userId);
  }

  return { request, sessionInfo };
} 