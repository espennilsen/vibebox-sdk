#!/bin/bash
# Docker Reset Script - Task T013
# Reset VibeBox database and restart services

set -e

echo "⚠️  WARNING: This will delete all data in the database!"
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo "🗑️  Stopping services..."
docker-compose down -v

echo "🔄 Resetting database..."
cd backend
npm run migrate:deploy
cd ..

echo "🚀 Starting services..."
docker-compose up -d

echo "✅ Reset complete!"
