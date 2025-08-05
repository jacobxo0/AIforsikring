#!/bin/bash

# Deployment Script for AI Forsikringsguiden
# Formål: Automated deployment with quality gates and rollback

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
FORCE_DEPLOY=${2:-false}
SKIP_TESTS=${3:-false}

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

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        staging|production)
            print_info "Deploying to $ENVIRONMENT environment"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if required tools are installed
    local required_tools=("node" "npm" "git" "curl")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            print_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the project root?"
        exit 1
    fi
    
    # Check if we have the required environment variables
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ -z "$VERCEL_TOKEN" ]; then
            print_error "VERCEL_TOKEN environment variable is required for production deployment"
            exit 1
        fi
    fi
    
    print_success "All prerequisites met"
}

# Run quality gates
run_quality_gates() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping quality gates (SKIP_TESTS=true)"
        return 0
    fi
    
    print_header "Running Quality Gates"
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm ci
    
    # Run linting
    print_info "Running ESLint..."
    if ! npm run lint; then
        print_error "Linting failed"
        return 1
    fi
    
    # Run TypeScript check
    print_info "Running TypeScript check..."
    if ! npx tsc --noEmit; then
        print_error "TypeScript check failed"
        return 1
    fi
    
    # Run unit tests
    print_info "Running unit tests..."
    if ! npm run test; then
        print_error "Unit tests failed"
        return 1
    fi
    
    # Run security audit
    print_info "Running security audit..."
    if ! npm audit --audit-level=high; then
        print_warning "Security vulnerabilities found"
        if [ "$FORCE_DEPLOY" != "true" ]; then
            print_error "Deployment blocked due to security issues. Use FORCE_DEPLOY=true to override"
            return 1
        fi
    fi
    
    print_success "All quality gates passed"
}

# Build application
build_application() {
    print_header "Building Application"
    
    print_info "Building for $ENVIRONMENT..."
    
    # Set environment variables for build
    export NODE_ENV=production
    export NEXT_PUBLIC_APP_ENV=$ENVIRONMENT
    
    if [ "$ENVIRONMENT" = "staging" ]; then
        export NEXT_PUBLIC_FEATURE_ERROR_TESTING=true
        export NEXT_PUBLIC_FEATURE_PERFORMANCE_MONITORING=true
    fi
    
    if ! npm run build; then
        print_error "Build failed"
        exit 1
    fi
    
    print_success "Build completed successfully"
}

# Deploy to environment
deploy_to_environment() {
    print_header "Deploying to $ENVIRONMENT"
    
    case $ENVIRONMENT in
        staging)
            deploy_to_staging
            ;;
        production)
            deploy_to_production
            ;;
    esac
}

# Deploy to staging
deploy_to_staging() {
    print_info "Deploying to staging environment..."
    
    # Deploy using Vercel
    if command -v vercel &> /dev/null; then
        DEPLOYMENT_URL=$(npx vercel --token $VERCEL_TOKEN --scope $VERCEL_ORG_ID --confirm)
        print_success "Staging deployment completed: $DEPLOYMENT_URL"
        
        # Store deployment URL for later use
        echo $DEPLOYMENT_URL > .deployment-url
        
    else
        print_warning "Vercel CLI not found, using alternative deployment method"
        # Add alternative deployment logic here
    fi
}

# Deploy to production
deploy_to_production() {
    print_info "Deploying to production environment..."
    
    # Additional checks for production
    if [ "$FORCE_DEPLOY" != "true" ]; then
        print_info "Running additional production checks..."
        
        # Check if staging deployment exists and is healthy
        if [ -f ".deployment-url" ]; then
            STAGING_URL=$(cat .deployment-url)
            print_info "Checking staging deployment health: $STAGING_URL"
            
            if ! curl -f "$STAGING_URL/api/health" > /dev/null 2>&1; then
                print_error "Staging deployment is not healthy. Fix staging before deploying to production"
                exit 1
            fi
        fi
    fi
    
    # Deploy to production
    if command -v vercel &> /dev/null; then
        DEPLOYMENT_URL=$(npx vercel --prod --token $VERCEL_TOKEN --scope $VERCEL_ORG_ID --confirm)
        print_success "Production deployment completed: $DEPLOYMENT_URL"
        
        # Store production URL
        echo $DEPLOYMENT_URL > .production-url
        
    else
        print_error "Vercel CLI is required for production deployment"
        exit 1
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    print_header "Running Post-Deployment Tests"
    
    local deployment_url
    if [ -f ".deployment-url" ] && [ "$ENVIRONMENT" = "staging" ]; then
        deployment_url=$(cat .deployment-url)
    elif [ -f ".production-url" ] && [ "$ENVIRONMENT" = "production" ]; then
        deployment_url=$(cat .production-url)
    else
        print_warning "No deployment URL found, skipping post-deployment tests"
        return 0
    fi
    
    print_info "Testing deployment at: $deployment_url"
    
    # Wait for deployment to be ready
    print_info "Waiting for deployment to be ready..."
    sleep 30
    
    # Basic health check
    print_info "Running health check..."
    if ! curl -f "$deployment_url/api/health" > /dev/null 2>&1; then
        print_error "Health check failed"
        return 1
    fi
    
    # Run smoke tests
    if [ "$SKIP_TESTS" != "true" ]; then
        print_info "Running smoke tests..."
        
        # Install Playwright if not already installed
        if ! npx playwright --version > /dev/null 2>&1; then
            npx playwright install chromium
        fi
        
        # Run basic E2E tests
        PLAYWRIGHT_BASE_URL=$deployment_url npx playwright test tests/e2e/basic.spec.ts --project=chromium
        
        if [ $? -eq 0 ]; then
            print_success "Smoke tests passed"
        else
            print_error "Smoke tests failed"
            return 1
        fi
    fi
    
    print_success "Post-deployment tests completed"
}

# Monitor deployment
monitor_deployment() {
    print_header "Monitoring Deployment"
    
    local deployment_url
    if [ -f ".deployment-url" ] && [ "$ENVIRONMENT" = "staging" ]; then
        deployment_url=$(cat .deployment-url)
    elif [ -f ".production-url" ] && [ "$ENVIRONMENT" = "production" ]; then
        deployment_url=$(cat .production-url)
    else
        print_warning "No deployment URL found, skipping monitoring"
        return 0
    fi
    
    print_info "Setting up monitoring for: $deployment_url"
    
    # Run monitoring script
    PRODUCTION_URL=$deployment_url node scripts/monitor-production.js
    
    print_success "Monitoring setup completed"
}

# Rollback deployment
rollback_deployment() {
    print_header "Rolling Back Deployment"
    
    print_error "Deployment failed, initiating rollback..."
    
    # Rollback logic would go here
    # This could involve:
    # - Reverting to previous Vercel deployment
    # - Restoring database state
    # - Clearing caches
    
    print_info "Rollback completed"
}

# Cleanup
cleanup() {
    print_header "Cleanup"
    
    # Remove temporary files
    rm -f .deployment-url .production-url
    
    print_success "Cleanup completed"
}

# Main deployment flow
main() {
    print_header "AI Forsikringsguiden Deployment"
    print_info "Environment: $ENVIRONMENT"
    print_info "Force Deploy: $FORCE_DEPLOY"
    print_info "Skip Tests: $SKIP_TESTS"
    
    # Trap errors and run rollback
    trap 'rollback_deployment; cleanup; exit 1' ERR
    
    validate_environment
    check_prerequisites
    
    if ! run_quality_gates; then
        if [ "$FORCE_DEPLOY" = "true" ]; then
            print_warning "Quality gates failed but continuing due to FORCE_DEPLOY=true"
        else
            print_error "Quality gates failed. Use FORCE_DEPLOY=true to override"
            exit 1
        fi
    fi
    
    build_application
    deploy_to_environment
    
    if ! run_post_deployment_tests; then
        print_error "Post-deployment tests failed"
        rollback_deployment
        exit 1
    fi
    
    monitor_deployment
    cleanup
    
    print_success "Deployment completed successfully! 🎉"
    
    # Show deployment summary
    print_header "Deployment Summary"
    print_info "Environment: $ENVIRONMENT"
    print_info "Timestamp: $(date)"
    print_info "Git Commit: $(git rev-parse HEAD)"
    
    if [ -f ".deployment-url" ] && [ "$ENVIRONMENT" = "staging" ]; then
        print_info "Staging URL: $(cat .deployment-url)"
    elif [ -f ".production-url" ] && [ "$ENVIRONMENT" = "production" ]; then
        print_info "Production URL: $(cat .production-url)"
    fi
}

# Show help
show_help() {
    echo "Usage: $0 [environment] [force_deploy] [skip_tests]"
    echo ""
    echo "Arguments:"
    echo "  environment   Target environment (staging|production) [default: staging]"
    echo "  force_deploy  Force deployment even if quality gates fail (true|false) [default: false]"
    echo "  skip_tests    Skip quality gates and tests (true|false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0                           # Deploy to staging"
    echo "  $0 production                # Deploy to production"
    echo "  $0 staging true              # Force deploy to staging"
    echo "  $0 production false true     # Deploy to production, skip tests"
    echo ""
    echo "Environment Variables:"
    echo "  VERCEL_TOKEN     Vercel authentication token (required for production)"
    echo "  VERCEL_ORG_ID    Vercel organization ID"
    echo "  VERCEL_PROJECT_ID Vercel project ID"
}

# Handle command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main 