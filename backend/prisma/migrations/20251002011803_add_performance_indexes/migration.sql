-- Add performance indexes for database query optimization

-- UserTeam: Add index on userId for faster user team lookups
CREATE INDEX IF NOT EXISTS "user_teams_user_id_idx" ON "user_teams"("user_id");

-- UserTeam: Add composite index for user role queries
CREATE INDEX IF NOT EXISTS "user_teams_user_id_role_idx" ON "user_teams"("user_id", "role");

-- Project: Add composite indexes for archived filtering
CREATE INDEX IF NOT EXISTS "projects_team_id_is_archived_idx" ON "projects"("team_id", "is_archived");
CREATE INDEX IF NOT EXISTS "projects_owner_id_is_archived_idx" ON "projects"("owner_id", "is_archived");

-- Environment: Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "environments_creator_id_status_idx" ON "environments"("creator_id", "status");
CREATE INDEX IF NOT EXISTS "environments_project_id_status_idx" ON "environments"("project_id", "status");

-- Session: Add composite index for environment session filtering
CREATE INDEX IF NOT EXISTS "sessions_environment_id_status_idx" ON "sessions"("environment_id", "status");

-- EnvironmentExtension: Add indexes on foreign keys
CREATE INDEX IF NOT EXISTS "environment_extensions_environment_id_idx" ON "environment_extensions"("environment_id");
CREATE INDEX IF NOT EXISTS "environment_extensions_extension_id_idx" ON "environment_extensions"("extension_id");
