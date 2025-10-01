#!/bin/bash
# Database Setup Script
# Applies migrations to VibeBox databases

set -e

echo "🗄️  VibeBox Database Setup"
echo ""

# Database connection details - use environment variables or defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-vibebox}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

# Check if password is set
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: POSTGRES_PASSWORD environment variable is not set"
    echo "Please set it with: export POSTGRES_PASSWORD=your_password"
    exit 1
fi

# Function to run SQL
run_sql() {
    local db=$1
    local sql=$2
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -c "$sql"
}

# Function to run SQL file
run_sql_file() {
    local db=$1
    local file=$2
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -f "$file"
}

echo "📊 Database Connection Info:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo ""

# Check connection
echo "🔌 Testing database connection..."
if run_sql "postgres" "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed!"
    echo "Please check your database connection settings."
    exit 1
fi

echo ""
echo "🏗️  Setting up development database (vibebox_dev)..."

# Check if migration has been applied
if run_sql "vibebox_dev" "SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1;" 2>/dev/null | grep -q 1; then
    echo "⚠️  Database already initialized. Skipping migration."
else
    echo "📝 Applying initial migration..."
    run_sql_file "vibebox_dev" "backend/prisma/migrations/20241001_initial_schema/migration.sql"
    echo "✅ Migration applied successfully!"
fi

echo ""
echo "🧪 Setting up test database (vibebox_test)..."

# Check if migration has been applied
if run_sql "vibebox_test" "SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1;" 2>/dev/null | grep -q 1; then
    echo "⚠️  Test database already initialized. Skipping migration."
else
    echo "📝 Applying initial migration to test database..."
    run_sql_file "vibebox_test" "backend/prisma/migrations/20241001_initial_schema/migration.sql"
    echo "✅ Test migration applied successfully!"
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 Database Summary:"
run_sql "vibebox_dev" "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

echo ""
echo "Next steps:"
echo "  1. Generate Prisma Client: cd backend && npm run db:generate"
echo "  2. Start development: npm run dev"
