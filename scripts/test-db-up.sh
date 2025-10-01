#!/bin/bash
# Test Database Up Script
# Start PostgreSQL container for testing

set -e

echo "🐘 Starting PostgreSQL container for testing..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start only the PostgreSQL service
docker-compose up -d postgres

# Wait for PostgreSQL to be healthy
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout 60 bash -c 'until docker-compose exec -T postgres pg_isready -U ${POSTGRES_USER:-vibebox} > /dev/null 2>&1; do sleep 1; done'

echo "✅ PostgreSQL is ready!"

# Create test database if it doesn't exist
echo "🗄️  Ensuring test database exists..."
docker-compose exec -T postgres psql -U ${POSTGRES_USER:-vibebox} -d ${POSTGRES_DB:-vibebox_dev} -c "SELECT 1 FROM pg_database WHERE datname = 'vibebox_test'" | grep -q 1 || \
    docker-compose exec -T postgres psql -U ${POSTGRES_USER:-vibebox} -d ${POSTGRES_DB:-vibebox_dev} -c "CREATE DATABASE vibebox_test;"

echo "✅ Test database ready!"
echo ""
echo "📊 Database Info:"
echo "  Container: vibebox-postgres"
echo "  Host: localhost:${POSTGRES_PORT:-5432}"
echo "  Dev DB: ${POSTGRES_DB:-vibebox_dev}"
echo "  Test DB: vibebox_test"
echo "  User: ${POSTGRES_USER:-vibebox}"
echo ""
echo "🧪 Run tests with: npm test"
echo "🛑 Stop database with: npm run test:db:down"
