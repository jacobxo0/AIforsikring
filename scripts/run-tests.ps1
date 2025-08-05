# Test Runner Script for AI Forsikringsguiden (PowerShell)
# Formål: Comprehensive test execution with reporting

param(
    [switch]$UnitOnly,
    [switch]$E2EOnly,
    [switch]$Performance,
    [switch]$Accessibility,
    [switch]$Headed,
    [string]$Browser = "chromium",
    [switch]$Help
)

# Configuration
$TestResultsDir = "test-results"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportDir = "$TestResultsDir/reports_$Timestamp"

# Functions
function Write-Header {
    param([string]$Message)
    Write-Host "================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "================================" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️ $Message" -ForegroundColor Cyan
}

# Show help
if ($Help) {
    Write-Host "Usage: .\scripts\run-tests.ps1 [options]"
    Write-Host "Options:"
    Write-Host "  -UnitOnly       Run only unit tests"
    Write-Host "  -E2EOnly        Run only e2e tests"
    Write-Host "  -Performance    Include performance tests"
    Write-Host "  -Accessibility  Include accessibility tests"
    Write-Host "  -Headed         Run tests in headed mode"
    Write-Host "  -Browser        Specify browser (chromium, firefox, webkit)"
    Write-Host "  -Help           Show this help message"
    exit 0
}

# Set test flags
$RunUnit = -not $E2EOnly
$RunE2E = -not $UnitOnly
$RunPerformance = $Performance
$RunAccessibility = $Accessibility
$Headless = -not $Headed

# Create test results directory
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

Write-Header "AI Forsikringsguiden Test Suite"
Write-Info "Test run started at $(Get-Date)"
Write-Info "Results will be saved to: $ReportDir"

# Check dependencies
Write-Info "Checking dependencies..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed"
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed"
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm install
}

# Check Playwright browsers
if ($RunE2E) {
    Write-Info "Checking Playwright browsers..."
    try {
        npx playwright --version | Out-Null
    }
    catch {
        Write-Warning "Playwright not found, installing..."
        npm run test:e2e:install
    }
}

# Initialize test results
$UnitTestsPassed = $false
$E2ETestsPassed = $false
$PerformanceTestsPassed = $false
$AccessibilityTestsPassed = $false

# Run unit tests
if ($RunUnit) {
    Write-Header "Running Unit Tests"
    
    try {
        npm run test:coverage -- --outputFile="$ReportDir/unit-test-results.json" --coverageDirectory="$ReportDir/coverage"
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Unit tests passed"
            $UnitTestsPassed = $true
        }
        else {
            Write-Error "Unit tests failed"
        }
    }
    catch {
        Write-Error "Unit tests failed with exception: $_"
    }
}

# Run E2E tests
if ($RunE2E) {
    Write-Header "Running End-to-End Tests"
    
    # Set Playwright options
    $PlaywrightOpts = @()
    if (-not $Headless) {
        $PlaywrightOpts += "--headed"
    }
    
    if ($Browser -ne "chromium") {
        $PlaywrightOpts += "--project=$Browser"
    }
    
    # Run different test suites
    Write-Info "Running error handling tests..."
    try {
        $testArgs = @("playwright", "test", "tests/e2e/error-handling.spec.ts") + $PlaywrightOpts + @("--reporter=json", "--output-dir=$ReportDir/e2e-error-handling")
        & npx @testArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Error handling tests passed"
        }
        else {
            Write-Error "Error handling tests failed"
        }
    }
    catch {
        Write-Error "Error handling tests failed with exception: $_"
    }
    
    Write-Info "Running user flow tests..."
    try {
        $testArgs = @("playwright", "test", "tests/e2e/user-flows.spec.ts") + $PlaywrightOpts + @("--reporter=json", "--output-dir=$ReportDir/e2e-user-flows")
        & npx @testArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Success "User flow tests passed"
        }
        else {
            Write-Error "User flow tests failed"
        }
    }
    catch {
        Write-Error "User flow tests failed with exception: $_"
    }
    
    Write-Info "Running basic functionality tests..."
    try {
        $testArgs = @("playwright", "test", "tests/e2e/basic.spec.ts", "tests/e2e/chat.spec.ts") + $PlaywrightOpts + @("--reporter=json", "--output-dir=$ReportDir/e2e-basic")
        & npx @testArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Basic functionality tests passed"
            $E2ETestsPassed = $true
        }
        else {
            Write-Error "Basic functionality tests failed"
        }
    }
    catch {
        Write-Error "Basic functionality tests failed with exception: $_"
    }
}

# Run performance tests
if ($RunPerformance) {
    Write-Header "Running Performance Tests"
    
    try {
        $testArgs = @("playwright", "test", "tests/e2e/performance-monitoring.spec.ts") + $PlaywrightOpts + @("--reporter=json", "--output-dir=$ReportDir/performance")
        & npx @testArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Performance tests passed"
            $PerformanceTestsPassed = $true
        }
        else {
            Write-Error "Performance tests failed"
        }
    }
    catch {
        Write-Error "Performance tests failed with exception: $_"
    }
}

# Run accessibility tests
if ($RunAccessibility) {
    Write-Header "Running Accessibility Tests"
    
    # Install axe-core if not present
    try {
        npm list @axe-core/playwright | Out-Null
    }
    catch {
        Write-Info "Installing axe-core for accessibility testing..."
        npm install --save-dev @axe-core/playwright
    }
    
    try {
        $testArgs = @("playwright", "test", "tests/e2e/accessibility.spec.ts") + $PlaywrightOpts + @("--reporter=json", "--output-dir=$ReportDir/accessibility")
        & npx @testArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Accessibility tests passed"
            $AccessibilityTestsPassed = $true
        }
        else {
            Write-Error "Accessibility tests failed"
        }
    }
    catch {
        Write-Error "Accessibility tests failed with exception: $_"
    }
}

# Generate comprehensive report
Write-Header "Generating Test Report"

$TestSummary = @"
# AI Forsikringsguiden Test Report

**Test Run**: $(Get-Date)
**Duration**: $((Get-Date) - (Get-Date $Timestamp)) seconds

## Test Results Summary

| Test Suite | Status | Details |
|------------|--------|---------|
| Unit Tests | $(if ($UnitTestsPassed) { "✅ PASSED" } else { "❌ FAILED" }) | Jest with coverage |
| E2E Tests | $(if ($E2ETestsPassed) { "✅ PASSED" } else { "❌ FAILED" }) | Playwright cross-browser |
| Performance Tests | $(if ($RunPerformance) { if ($PerformanceTestsPassed) { "✅ PASSED" } else { "❌ FAILED" } } else { "⏭️ SKIPPED" }) | Core Web Vitals |
| Accessibility Tests | $(if ($RunAccessibility) { if ($AccessibilityTestsPassed) { "✅ PASSED" } else { "❌ FAILED" } } else { "⏭️ SKIPPED" }) | WCAG compliance |

## Configuration

- **Browser**: $Browser
- **Headless**: $Headless
- **Environment**: $(if ($env:NODE_ENV) { $env:NODE_ENV } else { 'development' })

## Files Generated

- Unit test coverage: `coverage/index.html`
- E2E test reports: `playwright-report/index.html`
- Performance metrics: `performance/`
- Screenshots/Videos: `test-results/`

## Next Steps

$(if (-not $UnitTestsPassed) { "- 🔧 Fix failing unit tests`n" })$(if (-not $E2ETestsPassed) { "- 🔧 Fix failing E2E tests`n" })$(if ($RunPerformance -and -not $PerformanceTestsPassed) { "- 🔧 Address performance issues`n" })$(if ($RunAccessibility -and -not $AccessibilityTestsPassed) { "- 🔧 Fix accessibility violations`n" })

---
*Generated by AI Forsikringsguiden Test Suite*
"@

$TestSummary | Out-File -FilePath "$ReportDir/test-summary.md" -Encoding UTF8

Write-Success "Test report generated: $ReportDir/test-summary.md"

# Open reports if possible
if (Get-Command Start-Process -ErrorAction SilentlyContinue) {
    Write-Info "Opening test reports..."
    if (Test-Path "$ReportDir/coverage/index.html") {
        Start-Process "$ReportDir/coverage/index.html"
    }
    if (Test-Path "test-results/playwright-report/index.html") {
        Start-Process "test-results/playwright-report/index.html"
    }
}

# Final status
Write-Header "Test Run Complete"

$OverallSuccess = $true
if ($RunUnit -and -not $UnitTestsPassed) {
    $OverallSuccess = $false
}
if ($RunE2E -and -not $E2ETestsPassed) {
    $OverallSuccess = $false
}
if ($RunPerformance -and -not $PerformanceTestsPassed) {
    $OverallSuccess = $false
}
if ($RunAccessibility -and -not $AccessibilityTestsPassed) {
    $OverallSuccess = $false
}

if ($OverallSuccess) {
    Write-Success "All tests passed! 🎉"
    exit 0
}
else {
    Write-Error "Some tests failed. Check the reports for details."
    exit 1
} 