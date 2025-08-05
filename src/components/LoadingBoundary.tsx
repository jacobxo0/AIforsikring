'use client';

/**
 * Loading Boundary for AI Forsikringsguiden
 * Formål: Håndter loading states og Suspense fallbacks med danske UI elementer
 */

import React, { Suspense, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface LoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingText?: string;
  showSpinner?: boolean;
  minLoadingTime?: number;
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
}

export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <svg 
          className="h-full w-full text-blue-600" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>
  );
};

export const LoadingDots = () => (
  <div className="flex space-x-1">
    <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
    <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse [animation-delay:0.1s]"></div>
    <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse [animation-delay:0.2s]"></div>
  </div>
);

const DefaultLoadingFallback = ({ 
  text = 'Indlæser...', 
  showSpinner = true 
}: { 
  text?: string; 
  showSpinner?: boolean; 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
    {showSpinner && <LoadingSpinner size="lg" />}
    <div className="text-center">
      <p className="text-gray-600 font-medium">{text}</p>
      <LoadingDots />
    </div>
  </div>
);

export const PageLoadingFallback = ({ text = 'Indlæser siden...' }: { text?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center space-y-6">
      <div className="mx-auto">
        <LoadingSpinner size="lg" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{text}</h2>
        <p className="text-gray-500">Dette tager normalt kun et øjeblik</p>
      </div>
    </div>
  </div>
);

export class LoadingBoundary extends React.Component<
  LoadingBoundaryProps,
  { isLoading: boolean; startTime: number | null }
> {
  private minLoadingTimer: NodeJS.Timeout | null = null;

  constructor(props: LoadingBoundaryProps) {
    super(props);
    
    this.state = {
      isLoading: false,
      startTime: null
    };
  }

  componentDidMount() {
    if (this.props.onLoadingStart) {
      this.props.onLoadingStart();
    }

    this.setState({
      isLoading: true,
      startTime: Date.now()
    });

    logger.debug('LoadingBoundary: Loading started');
  }

  componentWillUnmount() {
    if (this.minLoadingTimer) {
      clearTimeout(this.minLoadingTimer);
    }

    if (this.props.onLoadingEnd) {
      this.props.onLoadingEnd();
    }

    if (this.state.startTime) {
      const duration = Date.now() - this.state.startTime;
      logger.performance('LoadingBoundary', duration, {
        component: 'LoadingBoundary'
      });
    }
  }

  render() {
    const { 
      children, 
      fallback, 
      loadingText = 'Indlæser...', 
      showSpinner = true
    } = this.props;

    const loadingFallback = fallback || (
      <DefaultLoadingFallback text={loadingText} showSpinner={showSpinner} />
    );

    return (
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    );
  }
}

export default LoadingBoundary; 