#!/bin/bash

# Test Runner Script for AI Forsikringsguiden
# Formål: Comprehensive test execution with reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="$TEST_RESULTS_DIR/reports_$TIMESTAMP"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Create test results directory
mkdir -p "$REPORT_DIR"

# Parse command line arguments
RUN_UNIT=true
RUN_E2E=true
RUN_PERFORMANCE=false
RUN_ACCESSIBILITY=false
HEADLESS=true
BROWSER="chromium"

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_E2E=false
            shift
            ;;
        --e2e-only)
            RUN_UNIT=false
            shift
            ;;
        --performance)
            RUN_PERFORMANCE=true
            shift
            ;;
        --accessibility)
            RUN_ACCESSIBILITY=true
            shift
            ;;
        --headed)
            HEADLESS=false
            shift
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --unit-only      Run only unit tests"
            echo "  --e2e-only       Run only e2e tests"
            echo "  --performance    Include performance tests"
            echo "  --accessibility  Include accessibility tests"
            echo "  --headed         Run tests in headed mode"
            echo "  --browser        Specify browser (chromium, firefox, webkit)"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_header "AI Forsikringsguiden Test Suite"
print_info "Test run started at $(date)"
print_info "Results will be saved to: $REPORT_DIR"

# Check if dependencies are installed
print_info "Checking dependencies..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
fi

# Check if Playwright browsers are installed
if [ "$RUN_E2E" = true ]; then
    print_info "Checking Playwright browsers..."
    if ! npx playwright --version &> /dev/null; then
        print_warning "Playwright not found, installing..."
        npm run test:e2e:install
    fi
fi

# Initialize test results
UNIT_TESTS_PASSED=false
E2E_TESTS_PASSED=false
PERFORMANCE_TESTS_PASSED=false
ACCESSIBILITY_TESTS_PASSED=false

# Run unit tests
if [ "$RUN_UNIT" = true ]; then
    print_header "Running Unit Tests"
    
    if npm run test:coverage -- --outputFile="$REPORT_DIR/unit-test-results.json" --coverageDirectory="$REPORT_DIR/coverage"; then
        print_success "Unit tests passed"
        UNIT_TESTS_PASSED=true
    else
        print_error "Unit tests failed"
    fi
fi

# Run E2E tests
if [ "$RUN_E2E" = true ]; then
    print_header "Running End-to-End Tests"
    
    # Set Playwright options
    PLAYWRIGHT_OPTS=""
    if [ "$HEADLESS" = false ]; then
        PLAYWRIGHT_OPTS="$PLAYWRIGHT_OPTS --headed"
    fi
    
    if [ "$BROWSER" != "chromium" ]; then
        PLAYWRIGHT_OPTS="$PLAYWRIGHT_OPTS --project=$BROWSER"
    fi
    
    # Run different test suites
    print_info "Running error handling tests..."
    if npx playwright test tests/e2e/error-handling.spec.ts $PLAYWRIGHT_OPTS --reporter=json --output-dir="$REPORT_DIR/e2e-error-handling"; then
        print_success "Error handling tests passed"
    else
        print_error "Error handling tests failed"
    fi
    
    print_info "Running user flow tests..."
    if npx playwright test tests/e2e/user-flows.spec.ts $PLAYWRIGHT_OPTS --reporter=json --output-dir="$REPORT_DIR/e2e-user-flows"; then
        print_success "User flow tests passed"
    else
        print_error "User flow tests failed"
    fi
    
    print_info "Running basic functionality tests..."
    if npx playwright test tests/e2e/basic.spec.ts tests/e2e/chat.spec.ts $PLAYWRIGHT_OPTS --reporter=json --output-dir="$REPORT_DIR/e2e-basic"; then
        print_success "Basic functionality tests passed"
        E2E_TESTS_PASSED=true
    else
        print_error "Basic functionality tests failed"
    fi
fi

# Run performance tests
if [ "$RUN_PERFORMANCE" = true ]; then
    print_header "Running Performance Tests"
    
    if npx playwright test tests/e2e/performance-monitoring.spec.ts $PLAYWRIGHT_OPTS --reporter=json --output-dir="$REPORT_DIR/performance"; then
        print_success "Performance tests passed"
        PERFORMANCE_TESTS_PASSED=true
    else
        print_error "Performance tests failed"
    fi
fi

# Run accessibility tests
if [ "$RUN_ACCESSIBILITY" = true ]; then
    print_header "Running Accessibility Tests"
    
    # Install axe-core if not present
    if ! npm list @axe-core/playwright &> /dev/null; then
        print_info "Installing axe-core for accessibility testing..."
        npm install --save-dev @axe-core/playwright
    fi
    
    if npx playwright test tests/e2e/accessibility.spec.ts $PLAYWRIGHT_OPTS --reporter=json --output-dir="$REPORT_DIR/accessibility"; then
        print_success "Accessibility tests passed"
        ACCESSIBILITY_TESTS_PASSED=true
    else
        print_error "Accessibility tests failed"
    fi
fi

# Generate comprehensive report
print_header "Generating Test Report"

cat > "$REPORT_DIR/test-summary.md" << EOF
# AI Forsikringsguiden Test Report

**Test Run**: $(date)
**Duration**: $(($(date +%s) - $(date -d "$TIMESTAMP" +%s 2>/dev/null || echo 0))) seconds

## Test Results Summary

| Test Suite | Status | Details |
|------------|--------|---------|
| Unit Tests | $([ "$UNIT_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED") | Jest with coverage |
| E2E Tests | $([ "$E2E_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED") | Playwright cross-browser |
| Performance Tests | $([ "$RUN_PERFORMANCE" = true ] && ([ "$PERFORMANCE_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED") || echo "⏭️ SKIPPED") | Core Web Vitals |
| Accessibility Tests | $([ "$RUN_ACCESSIBILITY" = true ] && ([ "$ACCESSIBILITY_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED") || echo "⏭️ SKIPPED") | WCAG compliance |

## Configuration

- **Browser**: $BROWSER
- **Headless**: $HEADLESS
- **Environment**: $(node -e "console.log(process.env.NODE_ENV || 'development')")

## Files Generated

- Unit test coverage: \`coverage/index.html\`
- E2E test reports: \`playwright-report/index.html\`
- Performance metrics: \`performance/\`
- Screenshots/Videos: \`test-results/\`

## Next Steps

$([ "$UNIT_TESTS_PASSED" = false ] && echo "- 🔧 Fix failing unit tests")
$([ "$E2E_TESTS_PASSED" = false ] && echo "- 🔧 Fix failing E2E tests")
$([ "$RUN_PERFORMANCE" = true ] && [ "$PERFORMANCE_TESTS_PASSED" = false ] && echo "- 🔧 Address performance issues")
$([ "$RUN_ACCESSIBILITY" = true ] && [ "$ACCESSIBILITY_TESTS_PASSED" = false ] && echo "- 🔧 Fix accessibility violations")

---
*Generated by AI Forsikringsguiden Test Suite*
EOF

print_success "Test report generated: $REPORT_DIR/test-summary.md"

# Open reports if in interactive mode
if [ -t 1 ] && command -v open &> /dev/null; then
    print_info "Opening test reports..."
    if [ -f "$REPORT_DIR/coverage/index.html" ]; then
        open "$REPORT_DIR/coverage/index.html"
    fi
    if [ -f "test-results/playwright-report/index.html" ]; then
        open "test-results/playwright-report/index.html"
    fi
fi

# Final status
print_header "Test Run Complete"

OVERALL_SUCCESS=true
if [ "$RUN_UNIT" = true ] && [ "$UNIT_TESTS_PASSED" = false ]; then
    OVERALL_SUCCESS=false
fi
if [ "$RUN_E2E" = true ] && [ "$E2E_TESTS_PASSED" = false ]; then
    OVERALL_SUCCESS=false
fi
if [ "$RUN_PERFORMANCE" = true ] && [ "$PERFORMANCE_TESTS_PASSED" = false ]; then
    OVERALL_SUCCESS=false
fi
if [ "$RUN_ACCESSIBILITY" = true ] && [ "$ACCESSIBILITY_TESTS_PASSED" = false ]; then
    OVERALL_SUCCESS=false
fi

if [ "$OVERALL_SUCCESS" = true ]; then
    print_success "All tests passed! 🎉"
    exit 0
else
    print_error "Some tests failed. Check the reports for details."
    exit 1
fi 