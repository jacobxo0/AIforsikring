/**
 * Feature Flags System for AI Forsikringsguiden
 * Formål: Dynamisk aktivering/deaktivering af features for A/B testing og gradual rollout
 * Kilder: Feature flag patterns, environment-based configuration
 */

import { logger } from './logger';

/**
 * Available feature flags
 */
export type FeatureFlag = 
  | 'ENABLE_PROACTIVE_INSIGHTS'
  | 'ENABLE_MULTI_AGENT_CHAT'
  | 'ENABLE_ADVANCED_DOCUMENT_ANALYSIS'
  | 'ENABLE_OCR_PROCESSING'
  | 'ENABLE_GDPR_AUDIT_LOGGING'
  | 'ENABLE_PERFORMANCE_MONITORING'
  | 'ENABLE_REAL_TIME_NOTIFICATIONS'
  | 'ENABLE_DARK_MODE'
  | 'ENABLE_BETA_FEATURES'
  | 'ENABLE_PREMIUM_FEATURES'
  | 'ENABLE_AI_DEBUGGING'
  | 'ENABLE_EXPERIMENTAL_UI'
  | 'ENABLE_SHADOW_DEPLOY'
  | 'ENABLE_ENHANCED_SECURITY'
  | 'ENABLE_ANALYTICS_TRACKING';

/**
 * Feature flag configuration with metadata
 */
interface FeatureFlagConfig {
  key: FeatureFlag;
  description: string;
  defaultValue: boolean;
  environment?: 'development' | 'staging' | 'production' | 'all';
  rolloutPercentage?: number;
  dependencies?: FeatureFlag[];
  minimumUserRole?: 'user' | 'premium' | 'admin';
}

/**
 * Feature flags configuration
 */
const FEATURE_FLAGS_CONFIG: Record<FeatureFlag, FeatureFlagConfig> = {
  ENABLE_PROACTIVE_INSIGHTS: {
    key: 'ENABLE_PROACTIVE_INSIGHTS',
    description: 'Enable AI-generated proactive insights for users',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 100
  },
  
  ENABLE_MULTI_AGENT_CHAT: {
    key: 'ENABLE_MULTI_AGENT_CHAT',
    description: 'Enable multi-agent chat system with specialized AI agents',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 100
  },
  
  ENABLE_ADVANCED_DOCUMENT_ANALYSIS: {
    key: 'ENABLE_ADVANCED_DOCUMENT_ANALYSIS',
    description: 'Enable advanced document analysis with AI classification',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 90
  },
  
  ENABLE_OCR_PROCESSING: {
    key: 'ENABLE_OCR_PROCESSING',
    description: 'Enable OCR text extraction from documents',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 95,
    dependencies: ['ENABLE_ADVANCED_DOCUMENT_ANALYSIS']
  },
  
  ENABLE_GDPR_AUDIT_LOGGING: {
    key: 'ENABLE_GDPR_AUDIT_LOGGING',
    description: 'Enable comprehensive GDPR-compliant audit logging',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 100
  },
  
  ENABLE_PERFORMANCE_MONITORING: {
    key: 'ENABLE_PERFORMANCE_MONITORING',
    description: 'Enable detailed performance monitoring and metrics',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 100
  },
  
  ENABLE_REAL_TIME_NOTIFICATIONS: {
    key: 'ENABLE_REAL_TIME_NOTIFICATIONS',
    description: 'Enable real-time notifications via WebSocket/SSE',
    defaultValue: false,
    environment: 'all',
    rolloutPercentage: 25
  },
  
  ENABLE_DARK_MODE: {
    key: 'ENABLE_DARK_MODE',
    description: 'Enable dark mode UI theme',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 100
  },
  
  ENABLE_BETA_FEATURES: {
    key: 'ENABLE_BETA_FEATURES',
    description: 'Enable beta features for testing',
    defaultValue: false,
    environment: 'development',
    rolloutPercentage: 100,
    minimumUserRole: 'premium'
  },
  
  ENABLE_PREMIUM_FEATURES: {
    key: 'ENABLE_PREMIUM_FEATURES',
    description: 'Enable premium features for paid users',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 100,
    minimumUserRole: 'premium'
  },
  
  ENABLE_AI_DEBUGGING: {
    key: 'ENABLE_AI_DEBUGGING',
    description: 'Enable AI debugging tools and verbose logging',
    defaultValue: true,
    environment: 'development',
    rolloutPercentage: 100,
    minimumUserRole: 'admin'
  },
  
  ENABLE_EXPERIMENTAL_UI: {
    key: 'ENABLE_EXPERIMENTAL_UI',
    description: 'Enable experimental UI components and layouts',
    defaultValue: false,
    environment: 'development',
    rolloutPercentage: 50
  },
  
  ENABLE_SHADOW_DEPLOY: {
    key: 'ENABLE_SHADOW_DEPLOY',
    description: 'Enable shadow deployment for canary testing',
    defaultValue: false,
    environment: 'staging',
    rolloutPercentage: 10,
    minimumUserRole: 'admin'
  },
  
  ENABLE_ENHANCED_SECURITY: {
    key: 'ENABLE_ENHANCED_SECURITY',
    description: 'Enable enhanced security features and monitoring',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 100
  },
  
  ENABLE_ANALYTICS_TRACKING: {
    key: 'ENABLE_ANALYTICS_TRACKING',
    description: 'Enable user analytics and behavior tracking',
    defaultValue: true,
    environment: 'all',
    rolloutPercentage: 100
  }
};

/**
 * Feature flag evaluation context
 */
interface FeatureFlagContext {
  userId?: string;
  userRole?: 'user' | 'premium' | 'admin';
  environment?: string;
  sessionId?: string;
}

/**
 * Simple hash function for user-based rollouts
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if environment matches feature flag requirement
 */
function environmentMatches(
  flagEnvironment: string | undefined,
  currentEnvironment: string
): boolean {
  if (!flagEnvironment || flagEnvironment === 'all') {
    return true;
  }
  return flagEnvironment === currentEnvironment;
}

/**
 * Check if user role meets minimum requirement
 */
function roleMatches(
  requiredRole: string | undefined,
  userRole: string | undefined
): boolean {
  if (!requiredRole) {
    return true;
  }
  
  if (!userRole) {
    return requiredRole === 'user';
  }
  
  const roleHierarchy = { user: 0, premium: 1, admin: 2 };
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Check if user is within rollout percentage
 */
function withinRollout(
  rolloutPercentage: number | undefined,
  userId: string | undefined
): boolean {
  if (!rolloutPercentage || rolloutPercentage >= 100) {
    return true;
  }
  
  if (!userId) {
    // For anonymous users, use random rollout
    return Math.random() * 100 < rolloutPercentage;
  }
  
  // For logged-in users, use consistent hash-based rollout
  const userHash = hashUserId(userId);
  return userHash < rolloutPercentage;
}

/**
 * Check if all dependencies are enabled
 */
function dependenciesEnabled(
  dependencies: FeatureFlag[] | undefined,
  context: FeatureFlagContext
): boolean {
  if (!dependencies || dependencies.length === 0) {
    return true;
  }
  
  return dependencies.every(dep => isFeatureFlagEnabled(dep, context));
}

/**
 * Get feature flag value from environment variables
 */
function getEnvironmentFlagValue(flag: FeatureFlag): boolean | undefined {
  const envValue = process.env[`FEATURE_FLAG_${flag}`] || process.env[flag];
  
  if (envValue === undefined) {
    return undefined;
  }
  
  // Parse boolean values
  const normalizedValue = envValue.toLowerCase();
  if (normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'on') {
    return true;
  }
  if (normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === 'off') {
    return false;
  }
  
  return undefined;
}

/**
 * Main feature flag evaluation function
 */
export function isFeatureFlagEnabled(
  flag: FeatureFlag,
  context: FeatureFlagContext = {}
): boolean {
  const config = FEATURE_FLAGS_CONFIG[flag];
  
  if (!config) {
    logger.warn({ flag }, 'Unknown feature flag requested');
    return false;
  }
  
  // Check environment variable override first
  const envValue = getEnvironmentFlagValue(flag);
  if (envValue !== undefined) {
    logger.debug({ flag, value: envValue, source: 'environment' }, 'Feature flag from environment');
    return envValue;
  }
  
  const currentEnvironment = context.environment || process.env.NODE_ENV || 'development';
  
  // Check environment compatibility
  if (!environmentMatches(config.environment, currentEnvironment)) {
    logger.debug({ 
      flag, 
      requiredEnv: config.environment, 
      currentEnv: currentEnvironment 
    }, 'Feature flag disabled due to environment mismatch');
    return false;
  }
  
  // Check user role requirements
  if (!roleMatches(config.minimumUserRole, context.userRole)) {
    logger.debug({ 
      flag, 
      requiredRole: config.minimumUserRole, 
      userRole: context.userRole 
    }, 'Feature flag disabled due to insufficient user role');
    return false;
  }
  
  // Check dependencies
  if (!dependenciesEnabled(config.dependencies, context)) {
    logger.debug({ flag, dependencies: config.dependencies }, 'Feature flag disabled due to unmet dependencies');
    return false;
  }
  
  // Check rollout percentage
  if (!withinRollout(config.rolloutPercentage, context.userId)) {
    logger.debug({ 
      flag, 
      rolloutPercentage: config.rolloutPercentage, 
      userId: context.userId 
    }, 'Feature flag disabled due to rollout percentage');
    return false;
  }
  
  const enabled = config.defaultValue;
  
  logger.debug({ 
    flag, 
    enabled, 
    context,
    source: 'configuration' 
  }, 'Feature flag evaluated');
  
  return enabled;
}

/**
 * Get all enabled feature flags for a context
 */
export function getEnabledFeatureFlags(context: FeatureFlagContext = {}): FeatureFlag[] {
  return Object.keys(FEATURE_FLAGS_CONFIG)
    .filter(flag => isFeatureFlagEnabled(flag as FeatureFlag, context)) as FeatureFlag[];
}

/**
 * Get feature flag configuration
 */
export function getFeatureFlagConfig(flag: FeatureFlag): FeatureFlagConfig | undefined {
  return FEATURE_FLAGS_CONFIG[flag];
}

/**
 * Get all feature flags configuration
 */
export function getAllFeatureFlagsConfig(): Record<FeatureFlag, FeatureFlagConfig> {
  return FEATURE_FLAGS_CONFIG;
}

/**
 * Check multiple feature flags at once
 */
export function checkFeatureFlags(
  flags: FeatureFlag[],
  context: FeatureFlagContext = {}
): Record<FeatureFlag, boolean> {
  const result: Partial<Record<FeatureFlag, boolean>> = {};
  
  for (const flag of flags) {
    result[flag] = isFeatureFlagEnabled(flag, context);
  }
  
  return result as Record<FeatureFlag, boolean>;
}

/**
 * Default export for convenience
 */
export default {
  isEnabled: isFeatureFlagEnabled,
  getEnabled: getEnabledFeatureFlags,
  getConfig: getFeatureFlagConfig,
  getAllConfig: getAllFeatureFlagsConfig,
  check: checkFeatureFlags
}; 