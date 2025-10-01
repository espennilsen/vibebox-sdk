#!/bin/bash
# Docker Up Script - Task T013
# Start all VibeBox services

set -e

echo "🚀 Starting VibeBox services..."

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Start services
echo "🐳 Starting Docker Compose services..."
docker-compose up -d

echo "✅ Services started successfully!"
echo ""
echo "📊 Service URLs:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend API: http://localhost:3000"
echo "  - API Docs: http://localhost:3000/api/v1/docs"
echo ""
echo "📝 View logs with: docker-compose logs -f"
echo "🛑 Stop services with: npm run docker:down"
