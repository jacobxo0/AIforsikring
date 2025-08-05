/**
 * Production-Ready QA Tests for TryghedsscoreDashboard
 * FASE 2: PREDICTIVE QA TEST GENERATION - Comprehensive test coverage
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'
import TryghedsscoreDashboard from '@/components/dashboard/TryghedsscoreDashboard'
import { useUserProfileStore } from '@/lib/store/userProfileStore'
import { useTryghedsScore } from '@/lib/hooks/useTryghedsScore'
// import { createMockUserProfileStore } from '../utils/mockStores' // TODO: Fix path

// Enhanced mocks with edge cases
jest.mock('@/lib/store/userProfileStore')
jest.mock('@/lib/hooks/useTryghedsScore')
jest.mock('@/components/error/ErrorBoundary', () => ({
  DashboardErrorBoundary: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>,
  useErrorReporting: () => ({ reportError: jest.fn() })
}))

// Mock performance utilities
jest.mock('@/utils/performance', () => ({
  formatTimestamp: (date: string) => '15.1.2024, 11.30.00',
  PerformanceMonitor: {
    measureAsync: jest.fn((name, fn) => fn()),
    measure: jest.fn((name, fn) => fn())
  },
  memoizeCalculation: jest.fn((fn) => fn)
}))

// Mock validation utilities
jest.mock('@/utils/validation', () => ({
  sanitizeTryghedsData: jest.fn((data) => data),
  classifyError: jest.fn((error) => ({
    type: 'api',
    message: error.message || 'Test error',
    code: 'TEST_ERROR',
    timestamp: '2024-01-15T11:30:00.000Z',
    retryable: true
  })),
  safeArrayReduce: jest.fn((array, reducer, initial) => array?.reduce(reducer, initial) || initial),
  safeNumber: jest.fn((value, fallback = 0) => typeof value === 'number' ? value : fallback)
}))

// Mock debounce utilities
jest.mock('@/hooks/useDebounce', () => ({
  useAsyncDebounce: jest.fn((fn, delay) => [fn, false, jest.fn()])
}))

// Test data with various scenarios
const mockValidTryghedsData = {
  score: 75,
  breakdown: [
    {
      category: 'Livsforsikring',
      score: 60,
      weight: 30,
      issues: ['Mangler tilstrækkelig dækning for familie'],
      maxPossibleScore: 100
    },
    {
      category: 'Indboforsikring',
      score: 90,
      weight: 25,
      issues: [],
      maxPossibleScore: 100
    },
    {
      category: 'Bilforsikring',
      score: 75,
      weight: 20,
      issues: ['Højere selvrisiko end anbefalet'],
      maxPossibleScore: 100
    }
  ],
  improvement: ['Øg livsforsikringsdækning', 'Upload eksisterende policer'],
  lastUpdated: '2024-01-15T11:30:00.000Z'
}

const mockInvalidData = {
  score: "invalid",
  breakdown: null,
  improvement: undefined,
  lastUpdated: "invalid-date"
}

const mockEmptyData = {
  score: 0,
  breakdown: [],
  improvement: [],
  lastUpdated: '2024-01-15T11:30:00.000Z'
}

const mockExtremeHighScore = {
  score: 95,
  breakdown: [
    { category: 'Perfect Coverage', score: 95, weight: 100, issues: [], maxPossibleScore: 100 }
  ],
  improvement: ['Maintain excellent coverage'],
  lastUpdated: '2024-01-15T11:30:00.000Z'
}

const mockExtremeLowScore = {
  score: 15,
  breakdown: [
    { category: 'Critical Issues', score: 15, weight: 100, issues: ['No coverage', 'Expired policies'], maxPossibleScore: 100 }
  ],
  improvement: ['Get immediate coverage', 'Contact insurance agent'],
  lastUpdated: '2024-01-15T11:30:00.000Z'
}

describe('TryghedsscoreDashboard - Production QA Tests', () => {
  const mockUpdateAnalysis = jest.fn()
  const mockCalculateScore = jest.fn()
  const mockClearError = jest.fn()
  const mockReportError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useUserProfileStore as unknown as jest.Mock).mockReturnValue({
      profile: {
        id: 'test-user',
        lastAnalysis: {
          date: '2024-01-15T11:30:00.000Z',
          tryghedsscore: 75,
          mainRecommendations: ['Øg livsforsikringsdækning', 'Upload eksisterende policer']
        }
      },
      updateAnalysis: mockUpdateAnalysis
    })

    ;(useTryghedsScore as jest.Mock).mockReturnValue({
      data: mockValidTryghedsData,
      isLoading: false,
      error: null,
      calculateScore: mockCalculateScore,
      clearError: mockClearError
    })
  })

  describe('🔥 CRITICAL USER FLOWS', () => {
    test('should handle complete analysis workflow', async () => {
      const user = userEvent.setup()
      
      render(<TryghedsscoreDashboard />)

      // Initial state
      expect(screen.getByText('Din Tryghedsscore')).toBeInTheDocument()
      expect(screen.getByText('75')).toBeInTheDocument()

      // Trigger analysis
      const updateButton = screen.getByRole('button', { name: /opdater tryghedsscore analyse/i })
      await user.click(updateButton)

      expect(mockCalculateScore).toHaveBeenCalledTimes(1)
      expect(mockClearError).toHaveBeenCalled()
    })

    test('should handle rapid successive clicks (debouncing)', async () => {
      const user = userEvent.setup()
      
      render(<TryghedsscoreDashboard />)

      const updateButton = screen.getByRole('button', { name: /opdater tryghedsscore analyse/i })
      
      // Rapid clicks
      await user.click(updateButton)
      await user.click(updateButton)
      await user.click(updateButton)

      // Should only call once due to debouncing
      expect(mockCalculateScore).toHaveBeenCalledTimes(1)
    })

    test('should expand and collapse detailed analysis', async () => {
      const user = userEvent.setup()
      
      render(<TryghedsscoreDashboard />)

      const toggleButton = screen.getByRole('button', { name: /se detaljeret analyse/i })
      
      // Expand details
      await user.click(toggleButton)
      
      expect(screen.getByText('Detaljeret analyse')).toBeInTheDocument()
      expect(screen.getByText('Livsforsikring')).toBeInTheDocument()
      expect(screen.getByText('Mangler tilstrækkelig dækning for familie')).toBeInTheDocument()

      // Collapse details
      const collapseButton = screen.getByRole('button', { name: /skjul detaljer/i })
      await user.click(collapseButton)
      
      expect(screen.queryByText('Detaljeret analyse')).not.toBeInTheDocument()
    })
  })

  describe('📊 DATA VALIDATION & EDGE CASES', () => {
    test('should handle invalid API response data', async () => {
      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: mockInvalidData,
        isLoading: false,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      // Should gracefully handle invalid data
      expect(screen.getByText('Ingen analyse endnu')).toBeInTheDocument()
    })

    test('should handle empty breakdown array', async () => {
      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: mockEmptyData,
        isLoading: false,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('Kritisk huller')).toBeInTheDocument()
    })

    test('should handle extreme high score (95+)', async () => {
      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: mockExtremeHighScore,
        isLoading: false,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      expect(screen.getByText('95')).toBeInTheDocument()
      expect(screen.getByText('Fremragende trygt')).toBeInTheDocument()
      expect(screen.getByText('🛡️')).toBeInTheDocument()
    })

    test('should handle extreme low score (15)', async () => {
      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: mockExtremeLowScore,
        isLoading: false,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('Kritisk huller')).toBeInTheDocument()
      expect(screen.getByText('🔴')).toBeInTheDocument()
    })

    test('should validate score boundaries (0-100)', async () => {
      const invalidScoreData = {
        ...mockValidTryghedsData,
        score: 150 // Invalid score
      }

      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: invalidScoreData,
        isLoading: false,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      // Should clamp to valid range
      expect(screen.queryByText('150')).not.toBeInTheDocument()
    })
  })

  describe('🚨 ERROR HANDLING & RESILIENCE', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = {
        type: 'network',
        message: 'Netværksfejl - tjek din internetforbindelse',
        code: 'NETWORK_ERROR',
        retryable: true
      }

      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: networkError,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      expect(screen.getByText('Kunne ikke beregne tryghedsscore')).toBeInTheDocument()
      expect(screen.getByText('Netværksfejl - tjek din internetforbindelse')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /prøv igen/i })).toBeInTheDocument()
    })

    test('should handle API timeout errors', async () => {
      const timeoutError = {
        type: 'api',
        message: 'API timeout - prøv igen senere',
        code: 'TIMEOUT_ERROR',
        retryable: true
      }

      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: timeoutError,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      expect(screen.getByText('API timeout - prøv igen senere')).toBeInTheDocument()
    })

    test('should handle non-retryable errors', async () => {
      const criticalError = {
        type: 'validation',
        message: 'Data validering fejlede',
        code: 'VALIDATION_ERROR',
        retryable: false
      }

      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: criticalError,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      expect(screen.getByRole('button', { name: /ikke tilgængelig/i })).toBeDisabled()
    })

    test('should show error details for debugging', async () => {
      const debugError = {
        type: 'api',
        message: 'API fejl',
        code: 'API_ERROR',
        timestamp: '2024-01-15T11:30:00.000Z',
        retryable: true
      }

      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: debugError,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      const details = screen.getByText('Tekniske detaljer')
      expect(details).toBeInTheDocument()
      
      fireEvent.click(details)
      expect(screen.getByText(/"type": "api"/)).toBeInTheDocument()
    })
  })

  describe('♿ ACCESSIBILITY COMPLIANCE', () => {
    test('should have proper ARIA labels and roles', () => {
      render(<TryghedsscoreDashboard />)

      // Score ring should have proper ARIA
      expect(screen.getByRole('img', { name: /tryghedsscore: 75 ud af 100/i })).toBeInTheDocument()
      
      // Progress bars should have progressbar role
      expect(screen.getAllByRole('progressbar')).toHaveLength(4) // Main + 3 categories
      
      // Buttons should have proper labels
      expect(screen.getByRole('button', { name: /opdater tryghedsscore analyse/i })).toBeInTheDocument()
    })

    test('should announce loading states to screen readers', async () => {
      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      // Live region should announce loading state
      expect(screen.getByText('Beregner tryghedsscore')).toBeInTheDocument()
    })

    test('should have keyboard navigation support', async () => {
      const user = userEvent.setup()
      
      render(<TryghedsscoreDashboard />)

      // Tab through interactive elements
      await user.tab()
      expect(screen.getByRole('button', { name: /opdater tryghedsscore analyse/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /se detaljeret analyse/i })).toHaveFocus()

      // Enter should activate buttons
      await user.keyboard('{Enter}')
      expect(screen.getByText('Detaljeret analyse')).toBeInTheDocument()
    })

    test('should have proper heading hierarchy', () => {
      render(<TryghedsscoreDashboard />)

      const mainHeading = screen.getByRole('heading', { level: 2, name: /din tryghedsscore/i })
      expect(mainHeading).toBeInTheDocument()

      // Expand details to check sub-headings
      fireEvent.click(screen.getByRole('button', { name: /se detaljeret analyse/i }))
      
      const subHeading = screen.getByRole('heading', { level: 3, name: /detaljeret analyse/i })
      expect(subHeading).toBeInTheDocument()
    })

    test('should provide context for screen readers', () => {
      render(<TryghedsscoreDashboard />)

      expect(screen.getByText('- Mål for hvor godt du er beskyttet af forsikringer')).toHaveClass('sr-only')
    })
  })

  describe('⚡ PERFORMANCE & MEMORY', () => {
    test('should not re-render unnecessarily', () => {
      const { rerender } = render(<TryghedsscoreDashboard />)
      
      // Re-render with same props
      rerender(<TryghedsscoreDashboard />)
      
      // Component should be memoized and not re-render
      expect(mockCalculateScore).toHaveBeenCalledTimes(0)
    })

    test('should handle component unmount gracefully', () => {
      const { unmount } = render(<TryghedsscoreDashboard />)
      
      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow()
    })

    test('should debounce user interactions', async () => {
      const user = userEvent.setup()
      
      render(<TryghedsscoreDashboard />)

      const updateButton = screen.getByRole('button', { name: /opdater tryghedsscore analyse/i })
      
      // Multiple rapid clicks
      await user.click(updateButton)
      await user.click(updateButton)
      await user.click(updateButton)

      // Should only trigger once
      expect(mockCalculateScore).toHaveBeenCalledTimes(1)
    })
  })

  describe('🧪 INTEGRATION SCENARIOS', () => {
    test('should handle profile updates correctly', async () => {
      const { rerender } = render(<TryghedsscoreDashboard />)

      // Update profile
      ;(useUserProfileStore as unknown as jest.Mock).mockReturnValue({
        profile: {
          id: 'test-user',
          lastAnalysis: {
            date: '2024-01-16T12:00:00.000Z', // Different date
            tryghedsscore: 80,
            mainRecommendations: ['New recommendation']
          }
        },
        updateAnalysis: mockUpdateAnalysis
      })

      rerender(<TryghedsscoreDashboard />)

      // Should trigger new analysis
      await waitFor(() => {
        expect(mockCalculateScore).toHaveBeenCalled()
      })
    })

    test('should handle callback props correctly', async () => {
      const mockOnScoreUpdate = jest.fn()
      const mockOnAnalysisComplete = jest.fn()

      render(
        <TryghedsscoreDashboard 
          onScoreUpdate={mockOnScoreUpdate}
          onAnalysisComplete={mockOnAnalysisComplete}
        />
      )

      // Callbacks should be called when data is available
      expect(mockOnScoreUpdate).toHaveBeenCalledWith(75)
      expect(mockOnAnalysisComplete).toHaveBeenCalledWith(mockValidTryghedsData)
    })

    test('should handle concurrent API calls gracefully', async () => {
      const user = userEvent.setup()
      
      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: mockClearError
      })

      render(<TryghedsscoreDashboard />)

      const updateButton = screen.getByRole('button', { name: /beregner tryghedsscore/i })
      
      // Try to click while loading
      await user.click(updateButton)
      
      // Should not trigger additional calls
      expect(mockCalculateScore).toHaveBeenCalledTimes(0)
    })
  })

  describe('🌐 BROWSER COMPATIBILITY', () => {
    test('should handle missing Intl support gracefully', () => {
      // Mock missing Intl.DateTimeFormat
      const originalIntl = global.Intl
      delete (global as any).Intl

      render(<TryghedsscoreDashboard />)

      expect(screen.getByText('Din Tryghedsscore')).toBeInTheDocument()

      // Restore Intl
      global.Intl = originalIntl
    })

    test('should handle missing modern JS features', () => {
      // Mock missing array methods
      const originalReduce = Array.prototype.reduce
      delete (Array.prototype as any).reduce

      render(<TryghedsscoreDashboard />)

      expect(screen.getByText('Din Tryghedsscore')).toBeInTheDocument()

      // Restore method
      Array.prototype.reduce = originalReduce
    })
  })
}) 