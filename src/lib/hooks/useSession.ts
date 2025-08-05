/**
 * useSession Hook for AI Forsikringsguiden
 * Formål: Provide session information for error boundaries and tracking
 */

'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface SessionInfo {
  sessionId: string | null;
  userId?: string;
  isAuthenticated: boolean;
  userRole?: 'user' | 'premium' | 'admin';
}

/**
 * Hook to get current session information
 */
export const useSession = (): SessionInfo => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    sessionId: null,
    isAuthenticated: false
  });

  useEffect(() => {
    const initializeSession = (): void => {
      try {
        // Generate a client-side session ID for error tracking
        // In a real app, this would come from your auth system
        const sessionId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        setSessionInfo({
          sessionId,
          isAuthenticated: false, // Would be determined by actual auth state
          // These would come from your auth system:
          // userId: user?.id,
          // userRole: user?.role
        });
        
        logger.debug('Session initialized', { sessionId });
      } catch (error) {
        logger.error('Failed to initialize session', error);
        setSessionInfo({
          sessionId: null,
          isAuthenticated: false
        });
      }
    };

    initializeSession();
  }, []);

  return sessionInfo;
}; 