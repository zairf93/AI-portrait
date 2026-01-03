#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "🔄 Regenerating API client..."

# Step 1: Export OpenAPI schema from backend
echo "📝 Exporting OpenAPI schema..."
uv run python scripts/export_openapi.py

# Step 2: Generate TypeScript types in frontend
echo "🎨 Generating TypeScript types..."
(cd site && npm run generate:api)

echo "✅ API client regenerated successfully!"
echo ""
echo "Generated files:"
echo "  - openapi.json (OpenAPI schema)"
echo "  - site/lib/api/schema.ts (TypeScript types)"
echo ""
echo "Usage in frontend:"
echo "  import { api } from '@/lib/api/client';"
