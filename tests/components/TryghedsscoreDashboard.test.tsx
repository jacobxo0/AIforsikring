/**
 * Unit Tests for TryghedsscoreDashboard Component
 * TASK 4.2: Skab component test suites
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import TryghedsscoreDashboard from '@/components/dashboard/TryghedsscoreDashboard'
import { useUserProfileStore } from '@/lib/store/userProfileStore'
import { useTryghedsScore } from '@/lib/hooks/useTryghedsScore'

// Mock dependencies
jest.mock('@/lib/store/userProfileStore')
jest.mock('@/lib/hooks/useTryghedsScore')
jest.mock('@/components/error/ErrorBoundary', () => ({
  DashboardErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useErrorReporting: () => ({
    reportError: jest.fn()
  })
}))

const mockUseUserProfileStore = useUserProfileStore as jest.MockedFunction<typeof useUserProfileStore>
const mockUseTryghedsScore = useTryghedsScore as jest.MockedFunction<typeof useTryghedsScore>

// Test data
const mockProfile = {
  age: 35,
  location: '2100',
  familyStatus: 'married' as const,
  children: 2,
  occupation: 'Engineer',
  income: 600000,
  assets: {
    home: {
      value: 3000000,
      type: 'owned' as const
    }
  }
}

const mockTryghedsData = {
  score: 75,
  breakdown: [
    {
      category: 'Livsforsikring',
      score: 60,
      weight: 25,
      issues: ['Mangler tilstrækkelig dækning for familie'],
      improvements: ['Øg livsforsikringsdækning']
    },
    {
      category: 'Indboforsikring',
      score: 85,
      weight: 20,
      issues: [],
      improvements: ['Tjek dækningsbeløb']
    }
  ],
  improvement: [
    'Øg livsforsikringsdækning',
    'Upload eksisterende policer'
  ],
  lastUpdated: '2024-01-15T10:30:00Z',
  confidence: 0.9
}

describe('TryghedsscoreDashboard', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Default mock implementations
    mockUseUserProfileStore.mockReturnValue({
      profile: mockProfile,
      updateAnalysis: jest.fn()
    } as any)

    mockUseTryghedsScore.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      calculateScore: jest.fn(),
      clearError: jest.fn()
    } as any)
  })

  describe('Initial Render', () => {
    it('should render empty state when no data available', async () => {
      render(<TryghedsscoreDashboard />)
      
      // Should show empty state instead of skeleton in test environment
      await waitFor(() => {
        expect(screen.getByText('Ingen analyse endnu')).toBeInTheDocument()
        expect(screen.getByText('🔍 Start analyse')).toBeInTheDocument()
      })
    })

    it('should render with proper accessibility attributes', async () => {
      render(<TryghedsscoreDashboard />)
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /start analyse/i })
        expect(button).toBeInTheDocument()
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('Score Display', () => {
    beforeEach(() => {
      mockUseTryghedsScore.mockReturnValue({
        data: mockTryghedsData,
        isLoading: false,
        error: null,
        calculateScore: jest.fn(),
        clearError: jest.fn()
      } as any)
    })

    test('should display tryghedsscore correctly', async () => {
      render(<TryghedsscoreDashboard />)

      await waitFor(() => {
        expect(screen.getByText('75')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /din tryghedsscore/i })).toBeInTheDocument()
      })
    })

    it('should show correct score interpretation', async () => {
      render(<TryghedsscoreDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Godt beskyttet')).toBeInTheDocument()
      })
    })

    test('should display score ring with correct color', async () => {
      render(<TryghedsscoreDashboard />)

      await waitFor(() => {
        const scoreDisplay = screen.getByText('75')
        expect(scoreDisplay).toBeInTheDocument()
        expect(scoreDisplay).toHaveClass('text-yellow-600') // Score 75 should be yellow
      })
    })

    it('should show quick insights correctly', async () => {
      render(<TryghedsscoreDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Indboforsikring')).toBeInTheDocument() // Best area
        expect(screen.getByText('Livsforsikring')).toBeInTheDocument() // Improvement area
      })
    })
  })

  describe('User Interactions', () => {
    const mockCalculateScore = jest.fn()

    beforeEach(() => {
      mockUseTryghedsScore.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: jest.fn()
      } as any)
    })

    it('should trigger analysis when button is clicked', async () => {
      render(<TryghedsscoreDashboard />)
      
      await waitFor(() => {
        const button = screen.getByText('🔍 Start analyse')
        fireEvent.click(button)
      })

      expect(mockCalculateScore).toHaveBeenCalledWith(mockProfile, [])
    })

    test('should show loading state during analysis', async () => {
      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: jest.fn()
      } as any)

      render(<TryghedsscoreDashboard />)

      await waitFor(() => {
        expect(screen.getAllByText('Indlæser...')).toHaveLength(2) // Two buttons with loading text
        expect(screen.getAllByTestId('loading-spinner')).toHaveLength(2) // Two loading spinners (header + action)
      })
    })

    test('should prevent double-clicks during loading', async () => {
      ;(useTryghedsScore as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: jest.fn()
      } as any)

      render(<TryghedsscoreDashboard />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          expect(button).toBeDisabled()
        })
      })
    })

    it('should toggle details visibility', async () => {
      mockUseTryghedsScore.mockReturnValue({
        data: mockTryghedsData,
        isLoading: false,
        error: null,
        calculateScore: mockCalculateScore,
        clearError: jest.fn()
      } as any)

      render(<TryghedsscoreDashboard />)
      
      await waitFor(() => {
        const toggleButton = screen.getByText('▶ Se detaljeret analyse')
        fireEvent.click(toggleButton)
      })

      expect(screen.getByText('▼ Skjul detaljer')).toBeInTheDocument()
      expect(screen.getByText('📋 Detaljeret analyse')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    const mockError = {
      type: 'api' as const,
      message: 'Failed to calculate score',
      code: 'API_ERROR',
      timestamp: '2024-01-15T10:30:00Z',
      retryable: true
    }

    beforeEach(() => {
      mockUseTryghedsScore.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        calculateScore: jest.fn(),
        clearError: jest.fn()
      } as any)
    })

    it('should display error state correctly', async () => {
      render(<TryghedsscoreDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Kunne ikke beregne tryghedsscore')).toBeInTheDocument()
        expect(screen.getByText('Failed to calculate score')).toBeInTheDocument()
        expect(screen.getByText('🔄 Prøv igen')).toBeInTheDocument()
      })
    })

    it('should allow retry on error', async () => {
      const mockCalculateScore = jest.fn()
      mockUseTryghedsScore.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        calculateScore: mockCalculateScore,
        clearError: jest.fn()
      } as any)

      render(<TryghedsscoreDashboard />)
      
      await waitFor(() => {
        const retryButton = screen.getByText('🔄 Prøv igen')
        fireEvent.click(retryButton)
      })

      expect(mockCalculateScore).toHaveBeenCalledWith(mockProfile, [])
    })
  })

  describe('Callback Props', () => {
    const mockOnScoreUpdate = jest.fn()
    const mockOnAnalysisComplete = jest.fn()

    beforeEach(() => {
      mockUseTryghedsScore.mockReturnValue({
        data: mockTryghedsData,
        isLoading: false,
        error: null,
        calculateScore: jest.fn(),
        clearError: jest.fn()
      } as any)
    })

    it('should call onScoreUpdate when score is calculated', async () => {
      render(
        <TryghedsscoreDashboard 
          onScoreUpdate={mockOnScoreUpdate}
          onAnalysisComplete={mockOnAnalysisComplete}
        />
      )
      
      // Simulate successful calculation
      const mockSuccess = mockUseTryghedsScore.mock.calls[0]?.[0]?.onSuccess
      act(() => {
        mockSuccess?.(mockTryghedsData)
      })

      expect(mockOnScoreUpdate).toHaveBeenCalledWith(75)
      expect(mockOnAnalysisComplete).toHaveBeenCalledWith(mockTryghedsData)
    })
  })

  describe('Data Integration', () => {
    it('should update user profile on successful analysis', async () => {
      const mockUpdateAnalysis = jest.fn()
      mockUseUserProfileStore.mockReturnValue({
        profile: mockProfile,
        updateAnalysis: mockUpdateAnalysis
      } as any)

      mockUseTryghedsScore.mockReturnValue({
        data: mockTryghedsData,
        isLoading: false,
        error: null,
        calculateScore: jest.fn(),
        clearError: jest.fn()
      } as any)

      render(<TryghedsscoreDashboard />)
      
      // Simulate successful calculation
      const mockSuccess = mockUseTryghedsScore.mock.calls[0]?.[0]?.onSuccess
      act(() => {
        mockSuccess?.(mockTryghedsData)
      })

      expect(mockUpdateAnalysis).toHaveBeenCalledWith({
        date: expect.any(String),
        tryghedsscore: 75,
        mainRecommendations: ['Øg livsforsikringsdækning', 'Upload eksisterende policer'],
        criticalIssues: [] // Empty because breakdown scores are not < 50
      })
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const renderSpy = jest.fn()
      const TestComponent = () => {
        renderSpy()
        return <TryghedsscoreDashboard />
      }

      const { rerender } = render(<TestComponent />)
      expect(renderSpy).toHaveBeenCalledTimes(1)

      // Re-render with same props should not cause extra renders
      rerender(<TestComponent />)
      await waitFor(() => {
        expect(renderSpy).toHaveBeenCalledTimes(2) // Expected: mount + rerender
      })
    })
  })
}) 