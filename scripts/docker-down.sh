#!/bin/bash
# Docker Down Script - Task T013
# Stop all VibeBox services

set -e

echo "🛑 Stopping VibeBox services..."

docker-compose down

echo "✅ Services stopped successfully!"
