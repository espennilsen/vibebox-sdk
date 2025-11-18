# Database Migration Deployment Checklist

## Prerequisites

- [ ] PostgreSQL 16+ running (via docker-compose or manual installation)
- [ ] `psql` command-line tool installed (or Docker access)
- [ ] Environment variables configured (.env files created)

## Migration Steps

### 1. Environment Configuration

```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env

# Edit .env files with your database credentials
# Make sure POSTGRES_PASSWORD matches your PostgreSQL setup
```

### 2. Start PostgreSQL (if using docker-compose)

```bash
# Start PostgreSQL container
docker-compose up postgres -d

# Wait for PostgreSQL to be ready
docker-compose logs postgres
# Look for: "database system is ready to accept connections"
```

### 3. Create Databases

```bash
# Connect to PostgreSQL
psql -h localhost -U vibebox -d postgres

# Create databases
CREATE DATABASE vibebox_dev;
CREATE DATABASE vibebox_test;

# Verify
\l vibebox_dev
\l vibebox_test

# Exit
\q
```

### 4. Apply Migration

#### Option A: Using the setup script (recommended)

```bash
export POSTGRES_PASSWORD=vibebox_dev_pass
./scripts/setup-db.sh
```

#### Option B: Manual application

```bash
# Apply to development database
psql -h localhost -U vibebox -d vibebox_dev \
  -f backend/prisma/migrations/20241001_initial_schema/migration.sql

# Apply to test database
psql -h localhost -U vibebox -d vibebox_test \
  -f backend/prisma/migrations/20241001_initial_schema/migration.sql
```

### 5. Verify Migration

```bash
# List tables in vibebox_dev
psql -h localhost -U vibebox -d vibebox_dev -c "\dt"

# Expected tables (11 total):
# - users
# - teams
# - user_teams
# - projects
# - environments
# - environment_ports
# - environment_variables
# - sessions
# - extensions
# - environment_extensions
# - log_entries
```

### 6. Generate Prisma Client

```bash
cd backend
npm install
npm run db:generate
```

Expected output: "✔ Generated Prisma Client"

### 7. Verify Connection

```bash
# Test database connection
cd backend
npm run db:studio
```

Opens browser at <http://localhost:5555> showing database tables.

## Validation

- [ ] All 11 tables created
- [ ] All 8 enums created
- [ ] All 20+ indexes created
- [ ] All 12 foreign keys created
- [ ] Prisma Client generated successfully
- [ ] Prisma Studio can connect and show data
- [ ] No errors in migration output

## Post-Migration

- [ ] Update [STATUS.md](./STATUS.md) to mark migration as complete
- [ ] Commit and push changes
- [ ] Close GitHub Issue #1
- [ ] Move to Phase 3.3: Contract Tests

## Rollback (if needed)

```bash
# Drop databases and recreate
psql -h localhost -U vibebox -d postgres -c "DROP DATABASE vibebox_dev;"
psql -h localhost -U vibebox -d postgres -c "DROP DATABASE vibebox_test;"
psql -h localhost -U vibebox -d postgres -c "CREATE DATABASE vibebox_dev;"
psql -h localhost -U vibebox -d postgres -c "CREATE DATABASE vibebox_test;"

# Re-apply migration
./scripts/setup-db.sh
```

## Troubleshooting

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed troubleshooting steps.

---

**Created**: 2025-10-01
**Issue**: #1
**PR**: TBD
