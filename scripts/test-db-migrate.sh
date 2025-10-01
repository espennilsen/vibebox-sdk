#!/bin/bash
# Test Database Migration Script
# Apply Prisma migrations to test database

set -e

echo "🔄 Applying migrations to test database..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if PostgreSQL is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo "❌ PostgreSQL container is not running!"
    echo "Start it with: npm run test:db:up"
    exit 1
fi

# Navigate to backend directory
cd backend

# Apply migrations to test database
echo "📝 Running Prisma migrations..."
DATABASE_URL="${DATABASE_URL_TEST}" npx prisma migrate deploy

echo "✅ Test database migrations complete!"
