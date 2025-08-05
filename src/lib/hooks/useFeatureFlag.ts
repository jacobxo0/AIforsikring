'use client';

/**
 * useFeatureFlag Hook for AI Forsikringsguiden
 * Formål: Reaktiv hook til feature flag håndtering med real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FeatureFlag, isFeatureFlagEnabled } from '@/lib/featureFlags';
import { logger } from '@/lib/logger';

interface UseFeatureFlagReturn {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseFeatureFlagsReturn {
  flags: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook til at tjekke en enkelt feature flag
 */
export function useFeatureFlag(flag: FeatureFlag): UseFeatureFlagReturn {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkFlag = useCallback((): void => {
    try {
      setLoading(true);
      setError(null);

      // For client-side, we use simplified context
      const flagEnabled = isFeatureFlagEnabled(flag, {
        environment: process.env.NODE_ENV || 'development'
      });

      setEnabled(flagEnabled);

      logger.debug('Feature flag checked', {
        flag,
        enabled: flagEnabled,
        environment: process.env.NODE_ENV
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ukendt fejl';
      setError(`Fejl ved feature flag tjek: ${errorMsg}`);
      setEnabled(false);
      
      logger.error('Feature flag check failed', err, {
        flag,
        error: errorMsg
      });
    } finally {
      setLoading(false);
    }
  }, [flag]);

  useEffect(() => {
    checkFlag();
  }, [checkFlag]);

  const refresh = useCallback(() => {
    checkFlag();
  }, [checkFlag]);

  return {
    enabled,
    loading,
    error,
    refresh
  };
}

/**
 * Hook til at hente alle feature flags på én gang
 */
export function useFeatureFlags(): UseFeatureFlagsReturn {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const allFlags: FeatureFlag[] = [
    'ENABLE_PROACTIVE_INSIGHTS',
    'ENABLE_MULTI_AGENT_CHAT',
    'ENABLE_ADVANCED_DOCUMENT_ANALYSIS',
    'ENABLE_OCR_PROCESSING',
    'ENABLE_GDPR_AUDIT_LOGGING',
    'ENABLE_PERFORMANCE_MONITORING',
    'ENABLE_REAL_TIME_NOTIFICATIONS',
    'ENABLE_DARK_MODE',
    'ENABLE_BETA_FEATURES',
    'ENABLE_PREMIUM_FEATURES',
    'ENABLE_AI_DEBUGGING',
    'ENABLE_EXPERIMENTAL_UI',
    'ENABLE_SHADOW_DEPLOY',
    'ENABLE_ENHANCED_SECURITY',
    'ENABLE_ANALYTICS_TRACKING'
  ];

  const checkAllFlags = useCallback((): void => {
    try {
      setLoading(true);
      setError(null);

      const flagResults: Record<string, boolean> = {};

      const context = {
        environment: process.env.NODE_ENV || 'development'
      };

      // Check alle flags
      allFlags.forEach((flag) => {
        const enabled = isFeatureFlagEnabled(flag, context);
        flagResults[flag] = enabled;
      });

      setFlags(flagResults);

      logger.debug('All feature flags checked', {
        flagCount: allFlags.length,
        enabledCount: Object.values(flagResults).filter(Boolean).length,
        environment: process.env.NODE_ENV
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ukendt fejl';
      setError(`Fejl ved feature flags tjek: ${errorMsg}`);
      
      // Set alle flags til false ved fejl
      const emptyFlags: Record<string, boolean> = {};
      allFlags.forEach(flag => {
        emptyFlags[flag] = false;
      });
      setFlags(emptyFlags);
      
      logger.error('Feature flags check failed', err, {
        error: errorMsg
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAllFlags();
  }, [checkAllFlags]);

  const refresh = useCallback(() => {
    checkAllFlags();
  }, [checkAllFlags]);

  return {
    flags,
    loading,
    error,
    refresh
  };
}

/**
 * HOC til at wrappe komponenter med feature flag tjek
 */
export function withFeatureFlag<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  flag: FeatureFlag,
  fallback?: React.ComponentType<P> | React.ReactElement | null
) {
  return function FeatureFlagWrapper(props: P) {
    const { enabled, loading } = useFeatureFlag(flag);

    if (loading) {
      return React.createElement('div', {
        className: 'animate-pulse bg-gray-200 h-4 w-full rounded'
      });
    }

    if (!enabled) {
      if (fallback === null) return null;
      if (React.isValidElement(fallback)) return fallback;
      if (fallback) {
        const FallbackComponent = fallback as React.ComponentType<P>;
        return React.createElement(FallbackComponent, props);
      }
      return null;
    }

    return React.createElement(Component, props);
  };
} 