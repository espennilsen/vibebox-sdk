#!/bin/bash
# Database Migration Verification Script
# Verifies that the database migration has been successfully applied

set -e

echo "🔍 VibeBox Database Migration Verification"
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

# Function to run SQL and return result
run_sql() {
    local db=$1
    local sql=$2
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -t -c "$sql"
}

echo "📊 Checking vibebox_dev database..."
echo ""

# Check if database exists
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw vibebox_dev; then
    echo "❌ Database 'vibebox_dev' does not exist!"
    echo "Please create it first: CREATE DATABASE vibebox_dev;"
    exit 1
fi

echo "✅ Database vibebox_dev exists"

# Count tables
TABLE_COUNT=$(run_sql "vibebox_dev" "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

echo "📊 Tables found: $TABLE_COUNT"

if [ "$TABLE_COUNT" -ne 11 ]; then
    echo "❌ Expected 11 tables, found $TABLE_COUNT"
    echo ""
    echo "Current tables:"
    run_sql "vibebox_dev" "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    exit 1
fi

echo "✅ Correct number of tables (11)"
echo ""

# List all tables
echo "📋 Tables in vibebox_dev:"
run_sql "vibebox_dev" "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | sed 's/^/ - /'
echo ""

# Verify specific tables exist
EXPECTED_TABLES=("users" "teams" "user_teams" "projects" "environments" "environment_ports" "environment_variables" "sessions" "extensions" "environment_extensions" "log_entries")

for table in "${EXPECTED_TABLES[@]}"; do
    if run_sql "vibebox_dev" "SELECT 1 FROM information_schema.tables WHERE table_name = '$table' LIMIT 1;" | grep -q 1; then
        echo "  ✅ Table '$table' exists"
    else
        echo "  ❌ Table '$table' is missing!"
        exit 1
    fi
done

echo ""
echo "📊 Checking enums..."

# Count enums
ENUM_COUNT=$(run_sql "vibebox_dev" "SELECT COUNT(*) FROM pg_type WHERE typtype = 'e';" | tr -d ' ')
echo "Enums found: $ENUM_COUNT"

if [ "$ENUM_COUNT" -lt 7 ]; then
    echo "❌ Expected at least 7 enums, found $ENUM_COUNT"
    exit 1
fi

echo "✅ Enums created"
echo ""

# Check indexes
INDEX_COUNT=$(run_sql "vibebox_dev" "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | tr -d ' ')
echo "📊 Indexes found: $INDEX_COUNT"

if [ "$INDEX_COUNT" -lt 20 ]; then
    echo "⚠️  Warning: Expected at least 20 indexes, found $INDEX_COUNT"
else
    echo "✅ Indexes created"
fi

echo ""
echo "📊 Checking foreign keys..."

FK_COUNT=$(run_sql "vibebox_dev" "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND constraint_schema = 'public';" | tr -d ' ')
echo "Foreign keys found: $FK_COUNT"

if [ "$FK_COUNT" -lt 12 ]; then
    echo "⚠️  Warning: Expected at least 12 foreign keys, found $FK_COUNT"
else
    echo "✅ Foreign keys created"
fi

echo ""
echo "🎉 Migration verification complete!"
echo ""
echo "✅ All checks passed for vibebox_dev"
echo ""
echo "Next steps:"
echo "  1. Run the same verification for vibebox_test (optional)"
echo "  2. Generate Prisma Client: cd backend && npm run db:generate"
echo "  3. Verify connection: cd backend && npm run db:studio"
echo "  4. Start development: npm run dev"
