/**
 * Error Boundary Components Index for AI Forsikringsguiden
 * Formål: Central export point for all error boundary components
 */

// Core error boundary system
export { ErrorBoundaryProvider } from './ErrorBoundaryProvider';
export type { ErrorBoundaryConfig, ErrorFallbackProps } from './ErrorBoundaryProvider';

// Hierarchical error boundaries
export {
  AppErrorBoundary,
  PageErrorBoundary,
  ComponentErrorBoundary,
  WidgetErrorBoundary,
  CriticalErrorBoundary,
  AsyncErrorBoundary,
  FormErrorBoundary,
  DataVizErrorBoundary,
  ThirdPartyErrorBoundary,
  HierarchicalErrorBoundary,
  ErrorBoundaryPresets
} from './ErrorBoundaryHierarchy';

// Fallback components
export {
  FallbackComponents,
  getFallbackComponent,
  InsuranceFallback,
  ChatFallback,
  DocumentUploadFallback,
  DashboardWidgetFallback,
  FormFieldFallback,
  DataTableFallback,
  ChartFallback,
  ApiConnectionFallback,
  PermissionDeniedFallback
} from './FallbackComponents';

// Integration components
export {
  SafeComponent,
  SafeWidget,
  SafeForm,
  SafeAsyncComponent,
  SafeCriticalComponent,
  SafeThirdPartyComponent,
  SafeDataViz,
  SafeInsuranceComponent,
  SafeChatComponent,
  SafeDocumentUpload,
  SafeDataTable,
  SafeApiComponent,
  withSafeWrapper
} from './ErrorBoundaryIntegration';

// Re-export the withErrorBoundary HOC from the provider
export { withErrorBoundary } from './ErrorBoundaryProvider'; 