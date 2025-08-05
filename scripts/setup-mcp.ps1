# TaskMaster MCP Setup Script for AI Forsikringsguiden (Windows PowerShell)
# Automatiseret opsætning af Model Context Protocol

param(
    [switch]$Force
)

Write-Host "🚀 TaskMaster MCP Setup for AI Forsikringsguiden" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js er ikke installeret. Installer Node.js først:" -ForegroundColor Red
    Write-Host "   https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm er ikke installeret" -ForegroundColor Red
    exit 1
}

# Get absolute path to project
$ProjectPath = Get-Location
Write-Host "📁 Projektsti: $ProjectPath" -ForegroundColor Blue

# Claude config path for Windows
$ClaudeConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
Write-Host "📝 Claude config sti: $ClaudeConfigPath" -ForegroundColor Blue

# Create Claude config directory if it doesn't exist
$ClaudeConfigDir = Split-Path $ClaudeConfigPath
if (-not (Test-Path $ClaudeConfigDir)) {
    New-Item -ItemType Directory -Path $ClaudeConfigDir -Force
}

# Backup existing config if it exists
if (Test-Path $ClaudeConfigPath) {
    $BackupPath = "$ClaudeConfigPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "💾 Backup af eksisterende config..." -ForegroundColor Yellow
    Copy-Item $ClaudeConfigPath $BackupPath
}

# Create Claude Desktop config
Write-Host "⚙️  Opretter Claude Desktop konfiguration..." -ForegroundColor Cyan

$ClaudeConfig = @{
    mcpServers = @{
        taskmaster = @{
            command = "npx"
            args = @(
                "-y",
                "@kazuph/mcp-taskmanager"
            )
            env = @{
                NODE_ENV = "production"
            }
        }
        filesystem = @{
            command = "npx"
            args = @(
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "$ProjectPath\src",
                "$ProjectPath\docs",
                "$ProjectPath\prompts"
            )
        }
    }
}

$ClaudeConfig | ConvertTo-Json -Depth 4 | Set-Content $ClaudeConfigPath -Encoding UTF8

# Test MCP server installation
Write-Host "🧪 Tester TaskMaster MCP server..." -ForegroundColor Cyan
try {
    $null = npx -y @kazuph/mcp-taskmanager --version 2>$null
    Write-Host "✅ TaskMaster MCP server kan installeres" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Kunne ikke teste TaskMaster MCP server" -ForegroundColor Yellow
}

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "📄 Opretter .env.local fil..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env.local"
    
    # Add MCP variables
    $McpConfig = @"

# MCP TaskMaster Configuration
MCP_TASKMASTER_ENABLED=true
MCP_TASKMASTER_AUTO_APPROVE=false
MCP_MAX_CONCURRENT_TASKS=5
"@
    
    Add-Content ".env.local" $McpConfig
}

Write-Host ""
Write-Host "🎉 TaskMaster MCP Setup Komplet!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Næste trin:" -ForegroundColor Cyan
Write-Host "1. Genstart Claude Desktop" -ForegroundColor White
Write-Host "2. Åbn en ny chat i Claude" -ForegroundColor White
Write-Host "3. Se efter 🔨 ikonet i nederste højre hjørne" -ForegroundColor White
Write-Host "4. Test med: 'Hjælp mig med at planlægge udvikling af nye forsikringsfunktioner'" -ForegroundColor White
Write-Host ""
Write-Host "📖 Læs mere i: docs/TASKMASTER_MCP_SETUP.md" -ForegroundColor Blue
Write-Host ""
Write-Host "🚨 Troubleshooting:" -ForegroundColor Yellow
Write-Host "   - Test server: npx -y @kazuph/mcp-taskmanager" -ForegroundColor White
Write-Host "   - Tjek Claude logs i: $env:APPDATA\Claude\Logs" -ForegroundColor White
Write-Host ""
Write-Host "✨ God fornøjelse med AI-drevet task management!" -ForegroundColor Magenta 