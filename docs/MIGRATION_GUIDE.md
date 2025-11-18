# Database Migration Guide

## 📋 Current Status

The VibeBox database schema has been designed and the migration SQL has been created, but **not yet applied** to the databases.

**Migration File**: `backend/prisma/migrations/20241001_initial_schema/migration.sql`

**Target Databases**:
- Development: `vibebox_dev` (local PostgreSQL via docker-compose)
- Test: `vibebox_test` (local PostgreSQL via docker-compose)

**Prerequisites**:
1. Copy `.env.example` to `.env` and configure your database credentials
2. Start PostgreSQL: `docker-compose up postgres -d`

## 🚀 Quick Apply (Recommended)

### Option 1: Using the Setup Script

```bash
# From the project root
# Set your PostgreSQL password first
export POSTGRES_PASSWORD=your_secure_password

# Run the setup script
./scripts/setup-db.sh
```

**Requirements**:
- `psql` command-line tool installed
- `POSTGRES_PASSWORD` environment variable set
- PostgreSQL running (via docker-compose or manually)

The script will:
- Test database connectivity
- Apply migration to vibebox_dev (if not already applied)
- Apply migration to vibebox_test (if not already applied)
- Display summary of created tables

### Option 2: Manual Application

If the script fails or you prefer manual control:

**For Development Database**:
```bash
# Use your configured credentials from .env
psql -h localhost -U ${POSTGRES_USER:-vibebox} -d vibebox_dev \
  -f backend/prisma/migrations/20241001_initial_schema/migration.sql
```

**For Test Database**:
```bash
psql -h localhost -U ${POSTGRES_USER:-vibebox} -d vibebox_test \
  -f backend/prisma/migrations/20241001_initial_schema/migration.sql
```

**Note**: You will be prompted for the database password configured in your `.env` file.

### Option 3: Using Docker

If you have Docker but not psql installed locally:

```bash
# Copy migration file to container
docker cp backend/prisma/migrations/20241001_initial_schema/migration.sql \
  vibebox-postgres:/tmp/migration.sql

# Apply to development database
docker exec vibebox-postgres psql -U vibebox -d vibebox_dev -f /tmp/migration.sql

# Apply to test database
docker exec vibebox-postgres psql -U vibebox -d vibebox_test -f /tmp/migration.sql
```

### Option 4: Using a Database GUI

Tools like pgAdmin, DBeaver, or TablePlus:

1. Connect to `localhost:5432`
2. Use credentials from your `.env` file
3. Select database: `vibebox_dev`
4. Open SQL editor
5. Paste contents of `backend/prisma/migrations/20241001_initial_schema/migration.sql`
5. Execute
6. Repeat for `vibebox_test`

## ✅ Verify Migration

After applying the migration, verify it worked:

```bash
# List all tables (use your credentials from .env)
psql -h localhost -U vibebox -d vibebox_dev -c "\dt"

# Should show 11 tables:
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

Or check table count:

```bash
psql -h localhost -U vibebox -d vibebox_dev -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

Expected result: **11 tables**

## 📊 What the Migration Creates

### Enums (8)
- UserTeamRole
- EnvironmentStatus
- Protocol
- SessionType
- SessionStatus
- EnvironmentExtensionStatus
- LogStream

### Tables (11)
1. **users** - User accounts
2. **teams** - Organizations/teams
3. **user_teams** - Team memberships with roles
4. **projects** - Project containers
5. **environments** - Docker environments
6. **environment_ports** - Port mappings
7. **environment_variables** - Environment variables
8. **sessions** - tmux/shell/vscode sessions
9. **extensions** - VS Code extension catalog
10. **environment_extensions** - Installed extensions
11. **log_entries** - Environment logs

### Indexes (20+)
All necessary indexes for performance, including:
- Unique constraints (email, slugs, composite keys)
- Foreign key indexes
- Query optimization indexes

### Foreign Keys (12)
Proper cascading delete rules for data integrity

## 🔄 After Migration

Once migration is applied:

1. **Generate Prisma Client**:
   ```bash
   cd backend
   npm run db:generate
   ```

2. **Verify with Prisma Studio** (optional):
   ```bash
   cd backend
   npm run db:studio
   ```
   Opens browser at http://localhost:5555 to view database

3. **Ready for development**:
   ```bash
   npm run dev
   ```

## 🐛 Troubleshooting

### "relation already exists"

**Cause**: Migration already applied

**Solution**: Skip or rollback first:
```bash
# Check if tables exist
psql -h localhost -U vibebox -d vibebox_dev -c "\dt"

# If tables exist, you're good!
```

### "connection refused"

**Cause**: Can't connect to database

**Solutions**:
1. Verify PostgreSQL container is running: `docker ps | grep vibebox-postgres`
2. Start if needed: `docker-compose up postgres -d`
3. Check logs: `docker logs vibebox-postgres`

### "authentication failed"

**Cause**: Wrong credentials

**Solution**: Verify credentials in your `.env` file match the docker-compose configuration

### "psql: command not found"

**Cause**: PostgreSQL client not installed

**Solutions**:
1. Install: `apt-get install postgresql-client` (Debian/Ubuntu)
2. Or use Docker method (Option 3 above)
3. Or use a database GUI (Option 4 above)

## 📝 Migration Details

**File**: `backend/prisma/migrations/20241001_initial_schema/migration.sql`

**Size**: ~15KB

**Estimated Time**: <5 seconds

**Idempotent**: No (will fail if already applied)

**Reversible**: Yes (would need to create a down migration)

## 🔗 Next Steps

After successful migration:

1. ✅ Database schema created
2. Generate Prisma Client: `cd backend && npm run db:generate`
3. Start development: `npm run dev`
4. Begin Phase 3.3: Contract Tests (TDD approach)

---

**Need Help?** Check [FAQ](./.claude/faq.md) or open a GitHub issue.
