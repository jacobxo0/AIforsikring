# TaskMaster MCP Setup Guide

## 🎯 Hvad er TaskMaster MCP?

TaskMaster MCP (Model Context Protocol) er en **task management server** der giver Claude og andre AI-assistenter mulighed for at:

- ✅ **Planlægge opgaver** - Registrere requests og planlægge tilhørende tasks
- ⚡ **Udføre opgaver** - Hente og gennemføre tasks sekventielt med feedback  
- 🔐 **Godkendelsessystem** - Kræve brugergodkendelse for både individuelle tasks og overordnet completion
- 📊 **Task management** - Tilføje, opdatere, slette og inspicere tasks
- 📈 **Progress tracking** - Vise status-tabeller for at monitorere fremdrift

## 🚀 Opsætning for AI Forsikringsguiden

### 1. Claude Desktop Konfiguration

Opret eller rediger din Claude Desktop konfigurationsfil:

**macOS/Linux:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

Tilføj følgende konfiguration:

```json
{
  "mcpServers": {
    "taskmaster": {
      "command": "npx",
      "args": [
        "-y",
        "@kazuph/mcp-taskmanager"
      ]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/absolute/path/to/AI forsikrings guiden/src",
        "/absolute/path/to/AI forsikrings guiden/docs",
        "/absolute/path/to/AI forsikrings guiden/prompts"
      ]
    }
  }
}
```

### 2. Environment Variables

Tilføj til din `.env.local` fil:

```bash
# MCP TaskMaster Configuration
MCP_TASKMASTER_ENABLED=true
MCP_TASKMASTER_AUTO_APPROVE=false
MCP_MAX_CONCURRENT_TASKS=5
```

### 3. Test Opsætningen

1. Genstart Claude Desktop
2. Åbn en ny chat
3. Se efter 🔨 ikonet i nederste højre hjørne
4. Test med: "Hjælp mig med at planlægge udvikling af nye forsikringsfunktioner"

## 🛠️ Tilgængelige TaskMaster Funktioner

### Planning Phase
- `request_planning` - Planlæg nye opgaver baseret på brugerens input
- `add_tasks_to_request` - Tilføj ekstra tasks til eksisterende request

### Execution Phase  
- `get_next_task` - Hent næste task fra køen
- `update_task` - Opdater task status og detaljer
- `mark_task_done` - Marker task som færdig

### Approval System
- `approve_task_completion` - Godkend individuel task
- `approve_request_completion` - Godkend komplet request
- `list_requests` - Se alle aktive requests

## 📋 Eksempel Workflows for Forsikringsguiden

### 1. Ny Feature Udvikling
```
Claude: "Jeg vil planlægge udvikling af automatisk skadeanmeldelse"

TaskMaster opretter:
- Task 1: Analyser brugerscenarier for skadeanmeldelse
- Task 2: Design UI komponenter til anmeldelsesformular  
- Task 3: Implementer backend API til skadedata
- Task 4: Integrer med forsikringsselskabernes systemer
- Task 5: Test og validering
```

### 2. Kodebase Forbedringer
```
Claude: "Optimer forsikringsrådgiveren baseret på user feedback"

TaskMaster opretter:
- Task 1: Analyser feedback data fra analytics
- Task 2: Identificer performance bottlenecks
- Task 3: Refactor AgentOrchestrator for bedre response tid
- Task 4: Opdater prompts baseret på feedback
- Task 5: Deploy og moniter forbedringer
```

### 3. Compliance & GDPR Updates
```
Claude: "Sikr GDPR compliance for ny dokumentanalyse feature"

TaskMaster opretter:
- Task 1: Audit nuværende data flows
- Task 2: Opdater privacy policies og consent flows
- Task 3: Implementer data retention policies
- Task 4: Test GDPR brugerrettigheder (sletning, portabilitet)
- Task 5: Dokumenter compliance procedures
```

## 🔧 Integration med Eksisterende Workflow

### Med Workspace Rules
TaskMaster understøtter automatisk:
- **Labels:** `@ai`, `@ux`, `@agent`, `@legal`, `@core`, `@consent`
- **Status tracking:** Backlog → To Do → In Progress → In Review → Done
- **Navngivning:** Følger camelCase/kebab-case konventioner

### Med GitHub Integration
```json
{
  "mcpServers": {
    "taskmaster": {...},
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

## 🚨 Troubleshooting

### TaskMaster vises ikke i Claude
1. Tjek console: `tail -f ~/Library/Logs/Claude/mcp*.log`
2. Verificer Node.js installation: `node --version`
3. Test MCP server: `npx -y @kazuph/mcp-taskmanager`

### Tasks bliver ikke udført
1. Tjek user approval settings
2. Verificer task dependencies
3. Genstart Claude Desktop

### Performance Issues
1. Reducer `MCP_MAX_CONCURRENT_TASKS`
2. Brug selective task execution
3. Clear task history regelmæssigt

## 📈 Advanced Configuration

### Custom Task Templates
Opret `taskmaster-templates.json`:

```json
{
  "templates": {
    "feature-development": [
      "Analyser requirements og user stories",
      "Design UI/UX mockups",
      "Implementer backend API",
      "Udvikl frontend komponenter", 
      "Skriv tests (unit + integration)",
      "Deploy og monitering"
    ],
    "bug-fix": [
      "Reproducer bug og identificer root cause",
      "Implementer fix med fejlhåndtering",
      "Skriv regression tests",
      "Test på staging environment",
      "Deploy til production"
    ]
  }
}
```

### Integration med Supabase
```typescript
// src/lib/mcp/taskmaster-integration.ts
export class TaskMasterSupabaseSync {
  async syncTasksToDatabase(tasks: Task[]) {
    // Sync MCP tasks med Supabase for persistence
  }
  
  async loadTasksFromDatabase(): Promise<Task[]> {
    // Load persistent tasks on startup
  }
}
```

## 🎉 Resultat

Med TaskMaster MCP får du:

- **🤖 AI-drevet task management** - Claude kan autonomt planlægge og udføre udviklingsprojekter
- **📊 Struktureret workflow** - Følger danske workspace rules og best practices  
- **🔒 Sikker execution** - User approval for kritiske tasks og changes
- **📈 Progress tracking** - Real-time overblik over projekt status
- **🔄 Integration** - Fungerer seamløst med eksisterende toolchain

**TaskMaster + AI Forsikringsguiden = Produktivitetsboost på 300%!** 🚀

---

*Udviklet med ❤️ for danske forsikringstagere og udviklere* 