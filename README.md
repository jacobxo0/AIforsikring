# AI Forsikringsguiden

Digital AI-assistent til forsikringsrelaterede henvendelser, analyser og dokumentforståelse.

## 🎯 Formål

Hjælpe danske borgere med:
- Forsikringsrådgivning og produktvalg
- Dokumentanalyse af policer og korrespondance  
- Juridisk vejledning i forsikringssager
- Skadeanmeldelser og procesvejledning

## 🏗️ Teknisk Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, OpenAI GPT-4
- **Database**: Supabase (planlagt)
- **Dokumenthåndtering**: PDF.js, Tesseract.js OCR
- **AI**: OpenAI API med specialiseret dansk forsikringsprompt
- **Testing**: Jest (unit), Playwright (E2E), Performance monitoring

## 🚀 Setup Guide

### 1. Installation
```bash
# Clone repository
git clone [repository-url]
cd ai-forsikringsguiden

# Install dependencies
npm install

# Install Playwright browsers
npm run test:e2e:install
```

### 2. Environment Setup
```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your API keys:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. Development
```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

## 📋 Kommandoliste

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run unit tests in watch mode
npm run test:coverage # Run unit tests with coverage
npm run test:e2e     # Run all E2E tests
npm run test:e2e:ui  # Run E2E tests with UI
npm run test:e2e:headed # Run E2E tests in headed mode
npm run test:e2e:debug # Debug E2E tests
npm run test:e2e:report # Show E2E test report
npm run test:all     # Run all tests (unit + E2E)
npm run test:ci      # Run tests for CI/CD

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with test data

# TaskMaster MCP
npm run mcp:taskmaster # Start TaskMaster MCP
npm run setup:mcp    # Setup MCP configuration
```

## 🧪 Testing Strategy

### Test Architecture
AI Forsikringsguiden implementerer en omfattende teststrategi med fokus på:

- **Error Handling & Recovery** - Robust fejlhåndtering på alle niveauer
- **Performance Monitoring** - Real-time overvågning og optimering
- **User Experience** - End-to-end brugerflows og accessibility
- **API Reliability** - Circuit breakers, retry logic og graceful degradation

### Test Types

#### 1. Unit Tests (Jest)
```bash
# Run unit tests
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Coverage:**
- Utility functions og business logic
- Error handling mechanisms
- API response parsing
- Data validation og transformation

#### 2. End-to-End Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suite
npx playwright test tests/e2e/error-handling.spec.ts

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

**Test Suites:**
- **Error Handling** - Error boundaries, API failures, network issues
- **User Flows** - Authentication, policy management, claims processing
- **Performance** - Core Web Vitals, loading times, memory usage
- **Chat Interface** - AI responses, document analysis, user interactions

#### 3. Performance Tests
```bash
# Run performance tests
npx playwright test tests/e2e/performance-monitoring.spec.ts

# With custom thresholds
npx playwright test --grep "performance"
```

**Metrics:**
- **LCP** (Largest Contentful Paint) < 2.5s
- **FID** (First Input Delay) < 100ms
- **CLS** (Cumulative Layout Shift) < 0.1
- **API Response Time** < 2s average

#### 4. Comprehensive Test Runner
```bash
# Linux/Mac
./scripts/run-tests.sh

# Windows
.\scripts\run-tests.ps1

# With options
./scripts/run-tests.sh --performance --accessibility --headed
```

### Error Handling Testing

#### Error Boundaries
- Component crash recovery
- Hierarchical error isolation
- User-friendly fallback UI
- Automatic retry mechanisms

#### API Error Handling
- Network failures og timeouts
- Server errors (5xx) og client errors (4xx)
- Authentication failures
- Rate limiting responses

#### Real-time Monitoring
- Error status indicators
- Live error streaming (SSE)
- Performance degradation alerts
- Circuit breaker status

### Test Data & Fixtures

Test data er organiseret i `tests/fixtures/`:
- **test-data.json** - Mock data for policies, claims, users
- **error-scenarios.json** - Predefined error conditions
- **performance-thresholds.json** - Performance benchmarks

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Tests
  run: |
    npm run test:ci
    npm run test:e2e -- --reporter=junit
```

### Test Reports

Efter test kørsel genereres:
- **Unit Test Coverage** - `coverage/index.html`
- **E2E Test Report** - `playwright-report/index.html`
- **Performance Metrics** - `test-results/performance/`
- **Screenshots/Videos** - `test-results/artifacts/`

## 📁 Projektstruktur

```
src/
├── app/                    # Next.js App Router
│   ├── api/chat/          # AI chat endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/
│   ├── chat/              # Chat components
│   │   ├── ChatWindow.tsx
│   │   └── ChatInput.tsx
│   ├── error-boundaries/  # Error boundary components
│   ├── ui/               # UI components with error handling
│   ├── PDFUpload.tsx     # Document upload
│   └── DocumentViewer.tsx # Document display
├── lib/
│   ├── agent/            # Entity extraction & logging
│   ├── error-handling/   # Error management system
│   ├── monitoring/       # Performance & health monitoring
│   └── api/             # API utilities with retry logic
tests/
├── e2e/                  # Playwright E2E tests
│   ├── error-handling.spec.ts
│   ├── user-flows.spec.ts
│   ├── performance-monitoring.spec.ts
│   ├── utils/           # Test helper utilities
│   ├── global-setup.ts  # Test environment setup
│   └── global-teardown.ts # Test cleanup
├── fixtures/            # Test data and mocks
└── unit/               # Jest unit tests
docs/
├── research/           # Foranalyse dokumenter
└── TASKMASTER_MCP_SETUP.md # MCP setup guide
scripts/
├── run-tests.sh        # Comprehensive test runner (Linux/Mac)
└── run-tests.ps1       # Comprehensive test runner (Windows)
prompts/
└── expertPrompt.txt    # AI system prompt
```

## 🔧 Funktioner

### ✅ Implementeret (Fase 1-5)
- ✅ Chat interface med AI-assistent
- ✅ Dokumentupload (PDF, tekst, billeder)
- ✅ Dokumentvisning med søgning
- ✅ Entity extraction fra chatbeskeder
- ✅ Struktureret AI-prompt til forsikringsrådgivning
- ✅ Responsiv design med dansk UI
- ✅ **Comprehensive Error Handling System**
- ✅ **Real-time Performance Monitoring**
- ✅ **Hierarchical Error Boundaries**
- ✅ **API Resilience (Circuit Breakers, Retry Logic)**
- ✅ **Live Error Streaming & Status Indicators**
- ✅ **Automated E2E Testing Suite**

### 🚧 I Udvikling (Fase 6)
- 🚧 CI/CD Pipeline med Shadow Deployment
- 🚧 Advanced Performance Analytics
- 🚧 Supabase integration og datalagring
- 🚧 PDF parsing med pdf-parse
- 🚧 OCR med Tesseract.js
- 🚧 Samtykkeflow og GDPR compliance
- 🚧 Brugerautentificering
- 🚧 Feedback system

### 📋 Planlagt
- 📋 Retsinformation.dk API integration
- 📋 Ankenævnet scraping
- 📋 PWA funktionalitet
- 📋 Mobil optimering
- 📋 Agent daemon til automatisk scanning

## 🤖 AI Funktionalitet

### Forsikringsrådgiver
- Forklarer forsikringstyper på forståelig dansk
- Sammenligner produkter og anbefaler løsninger
- Analyserer brugerens specifikke behov

### Dokumentanalyse
- Parser forsikringspolicer og udtrækker nøgleinfo
- Fremhæver vigtige klausuler og undtagelser
- Sammenfatter lange dokumenter

### Juridisk Vejledning
- Referencer dansk forsikringslovgivning
- Viser klageprocesser og tidsfrister
- Anbefaler professionel hjælp når nødvendigt

## 🔒 Sikkerhed og Compliance

### GDPR
- Explicit consent til databehandling
- Right to deletion og data portability
- Audit logging af alle interaktioner
- Kryptering af sensitive dokumenter

### AI Sikkerhed
- Input sanitization mod prompt injection
- Output filtering for sensitive information
- Rate limiting på API calls
- Transparent om AI-begrænsninger

### Error Handling & Monitoring
- **Comprehensive Error Boundaries** - Isolerer fejl og forhindrer total system crash
- **Real-time Monitoring** - Live overvågning af system health og performance
- **Graceful Degradation** - Systemet fortsætter med reduceret funktionalitet ved fejl
- **Automatic Recovery** - Intelligent retry logic og circuit breaker patterns
- **User Feedback** - Transparent fejlkommunikation til brugere

## 📊 Task Management

### TaskMaster MCP Integration ⚡
AI Forsikringsguiden bruger **TaskMaster MCP** til automatiseret projektledelse:

- **🤖 AI-drevet planlægning** - Claude kan automatisk planlægge udviklingsprojekter
- **⚡ Struktureret execution** - Tasks udføres sekventielt med approval system
- **📈 Progress tracking** - Real-time overblik over projektfremdrift
- **🔒 Sikker workflow** - User approval for kritiske ændringer

Se [TaskMaster MCP Setup Guide](docs/TASKMASTER_MCP_SETUP.md) for installation og konfiguration.

### Labels
- `@ai` - AI og prompt engineering
- `@ux` - UI/UX komponenter og flows
- `@legal` - Juridisk databehandling
- `@agent` - Scraping og automatisering
- `@core` - Kernefunktioner
- `@consent` - Samtykke og etik

### Status
- **Backlog** - Planlagte features
- **To Do** - Klar til implementering  
- **In Progress** - Under udvikling
- **In Review** - Klar til review
- **Done** - Færdiggjort

## 👥 Kontakt

**Projektansvarlig**: [Din kontaktinfo]
**Support**: [Support email]
**MCP Dokument**: [Link til MCP taskplan]

## ⚠️ Vigtige Noter

- Dette er ikke juridisk rådgivning
- Konsulter altid en advokat ved komplekse sager  
- AI kan lave fejl - verificer vigtige oplysninger
- Respekter brugerens autonomi i beslutninger

---

*Udviklet med ❤️ for danske forsikringstagere* 