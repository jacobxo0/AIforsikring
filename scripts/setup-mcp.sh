#!/bin/bash

# TaskMaster MCP Setup Script for AI Forsikringsguiden
# Automatiseret opsætning af Model Context Protocol

set -e

echo "🚀 TaskMaster MCP Setup for AI Forsikringsguiden"
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js er ikke installeret. Installer Node.js først:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm er ikke installeret"
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Get absolute path to project
PROJECT_PATH=$(pwd)
echo "📁 Projektsti: $PROJECT_PATH"

# Determine OS for Claude config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CLAUDE_CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    CLAUDE_CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
else
    # Linux
    echo "⚠️  Claude Desktop er ikke tilgængelig på Linux endnu"
    echo "Du kan stadig bruge MCP med andre clients"
    exit 0
fi

echo "📝 Claude config sti: $CLAUDE_CONFIG_PATH"

# Create Claude config directory if it doesn't exist
mkdir -p "$(dirname "$CLAUDE_CONFIG_PATH")"

# Backup existing config if it exists
if [[ -f "$CLAUDE_CONFIG_PATH" ]]; then
    echo "💾 Backup af eksisterende config..."
    cp "$CLAUDE_CONFIG_PATH" "${CLAUDE_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create or update Claude Desktop config
echo "⚙️  Opretter Claude Desktop konfiguration..."

cat > "$CLAUDE_CONFIG_PATH" << EOF
{
  "mcpServers": {
    "taskmaster": {
      "command": "npx",
      "args": [
        "-y",
        "@kazuph/mcp-taskmanager"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "$PROJECT_PATH/src",
        "$PROJECT_PATH/docs",
        "$PROJECT_PATH/prompts"
      ]
    }
  }
}
EOF

# Test MCP server installation
echo "🧪 Tester TaskMaster MCP server..."
if npx -y @kazuph/mcp-taskmanager --version &>/dev/null; then
    echo "✅ TaskMaster MCP server kan installeres"
else
    echo "⚠️  Kunne ikke teste TaskMaster MCP server"
fi

# Create .env.local if it doesn't exist
if [[ ! -f ".env.local" ]]; then
    echo "📄 Opretter .env.local fil..."
    cp .env.example .env.local
    
    # Add MCP variables
    cat >> .env.local << EOF

# MCP TaskMaster Configuration
MCP_TASKMASTER_ENABLED=true
MCP_TASKMASTER_AUTO_APPROVE=false
MCP_MAX_CONCURRENT_TASKS=5
EOF
fi

echo ""
echo "🎉 TaskMaster MCP Setup Komplet!"
echo "================================"
echo ""
echo "Næste trin:"
echo "1. Genstart Claude Desktop"
echo "2. Åbn en ny chat i Claude"
echo "3. Se efter 🔨 ikonet i nederste højre hjørne"
echo "4. Test med: 'Hjælp mig med at planlægge udvikling af nye forsikringsfunktioner'"
echo ""
echo "📖 Læs mere i: docs/TASKMASTER_MCP_SETUP.md"
echo ""
echo "🚨 Troubleshooting:"
echo "   - Tjek logs: tail -f ~/Library/Logs/Claude/mcp*.log"
echo "   - Test server: npx -y @kazuph/mcp-taskmanager"
echo ""
echo "✨ God fornøjelse med AI-drevet task management!" 