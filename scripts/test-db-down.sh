#!/bin/bash
# Test Database Down Script
# Stop PostgreSQL container

set -e

echo "🛑 Stopping PostgreSQL container..."
docker compose stop postgres

echo "✅ PostgreSQL stopped!"
echo ""
echo "💡 To remove the container and data, run: docker compose down -v"
