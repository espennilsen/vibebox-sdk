-- Initial Migration - Phase 3.2: Data Models (T016-T026)
-- CreateEnum: UserTeamRole
CREATE TYPE "UserTeamRole" AS ENUM ('admin', 'developer', 'viewer');

-- CreateEnum: EnvironmentStatus
CREATE TYPE "EnvironmentStatus" AS ENUM ('stopped', 'starting', 'running', 'stopping', 'error');

-- CreateEnum: Protocol
CREATE TYPE "Protocol" AS ENUM ('tcp', 'udp');

-- CreateEnum: SessionType
CREATE TYPE "SessionType" AS ENUM ('vscode_server', 'tmux', 'shell');

-- CreateEnum: SessionStatus
CREATE TYPE "SessionStatus" AS ENUM ('starting', 'active', 'idle', 'terminated');

-- CreateEnum: EnvironmentExtensionStatus
CREATE TYPE "EnvironmentExtensionStatus" AS ENUM ('pending', 'installing', 'installed', 'failed', 'uninstalling');

-- CreateEnum: LogStream
CREATE TYPE "LogStream" AS ENUM ('stdout', 'stderr');

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "ssh_public_key" TEXT,
    "notification_settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: teams
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_teams
CREATE TABLE "user_teams" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" "UserTeamRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: projects
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT,
    "team_id" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: environments
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "project_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "base_image" TEXT NOT NULL,
    "container_id" TEXT,
    "status" "EnvironmentStatus" NOT NULL,
    "error_message" TEXT,
    "cpu_limit" DECIMAL(4,2) NOT NULL DEFAULT 2.0,
    "memory_limit" INTEGER NOT NULL DEFAULT 4096,
    "storage_limit" INTEGER NOT NULL DEFAULT 20480,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "stopped_at" TIMESTAMP(3),

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: environment_ports
CREATE TABLE "environment_ports" (
    "id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "container_port" INTEGER NOT NULL,
    "host_port" INTEGER,
    "protocol" "Protocol" NOT NULL DEFAULT 'tcp',
    "description" TEXT,

    CONSTRAINT "environment_ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: environment_variables
CREATE TABLE "environment_variables" (
    "id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "session_name" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "connection_url" TEXT,
    "pid" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idle_timeout_minutes" INTEGER NOT NULL DEFAULT 30,
    "terminated_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: extensions
CREATE TABLE "extensions" (
    "id" TEXT NOT NULL,
    "extension_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "publisher" TEXT NOT NULL,
    "icon_url" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "download_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: environment_extensions
CREATE TABLE "environment_extensions" (
    "id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "extension_id" TEXT NOT NULL,
    "status" "EnvironmentExtensionStatus" NOT NULL,
    "error_message" TEXT,
    "installed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environment_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: log_entries
CREATE TABLE "log_entries" (
    "id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "stream" "LogStream" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");
CREATE INDEX "teams_name_idx" ON "teams"("name");

CREATE UNIQUE INDEX "user_teams_user_id_team_id_key" ON "user_teams"("user_id", "team_id");
CREATE INDEX "user_teams_team_id_idx" ON "user_teams"("team_id");

CREATE UNIQUE INDEX "projects_slug_owner_id_key" ON "projects"("slug", "owner_id");
CREATE UNIQUE INDEX "projects_slug_team_id_key" ON "projects"("slug", "team_id");
CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");
CREATE INDEX "projects_team_id_idx" ON "projects"("team_id");

CREATE UNIQUE INDEX "environments_project_id_slug_key" ON "environments"("project_id", "slug");
CREATE INDEX "environments_project_id_idx" ON "environments"("project_id");
CREATE INDEX "environments_creator_id_idx" ON "environments"("creator_id");
CREATE INDEX "environments_status_idx" ON "environments"("status");
CREATE INDEX "environments_container_id_idx" ON "environments"("container_id");

CREATE UNIQUE INDEX "environment_ports_environment_id_container_port_key" ON "environment_ports"("environment_id", "container_port");
CREATE INDEX "environment_ports_environment_id_idx" ON "environment_ports"("environment_id");
CREATE INDEX "environment_ports_host_port_idx" ON "environment_ports"("host_port");

CREATE UNIQUE INDEX "environment_variables_environment_id_key_key" ON "environment_variables"("environment_id", "key");

CREATE UNIQUE INDEX "sessions_environment_id_session_type_session_name_key" ON "sessions"("environment_id", "session_type", "session_name");
CREATE INDEX "sessions_environment_id_idx" ON "sessions"("environment_id");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");
CREATE INDEX "sessions_last_activity_at_idx" ON "sessions"("last_activity_at");

CREATE UNIQUE INDEX "extensions_extension_id_key" ON "extensions"("extension_id");
CREATE INDEX "extensions_publisher_idx" ON "extensions"("publisher");
CREATE INDEX "extensions_is_custom_idx" ON "extensions"("is_custom");

CREATE UNIQUE INDEX "environment_extensions_environment_id_extension_id_key" ON "environment_extensions"("environment_id", "extension_id");
CREATE INDEX "environment_extensions_status_idx" ON "environment_extensions"("status");

CREATE INDEX "log_entries_environment_id_timestamp_idx" ON "log_entries"("environment_id", "timestamp" DESC);
CREATE INDEX "log_entries_created_at_idx" ON "log_entries"("created_at");

-- AddForeignKey
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "environments" ADD CONSTRAINT "environments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "environments" ADD CONSTRAINT "environments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "environment_ports" ADD CONSTRAINT "environment_ports_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "environment_variables" ADD CONSTRAINT "environment_variables_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "environment_extensions" ADD CONSTRAINT "environment_extensions_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "environment_extensions" ADD CONSTRAINT "environment_extensions_extension_id_fkey" FOREIGN KEY ("extension_id") REFERENCES "extensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
