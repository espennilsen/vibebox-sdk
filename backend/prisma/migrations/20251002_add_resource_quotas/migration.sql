-- AlterTable
ALTER TABLE "users" ADD COLUMN "max_environments" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN "max_environments" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "max_members" INTEGER NOT NULL DEFAULT 20;

-- Note: Environment table already has cpuLimit, memoryLimit, and storageLimit fields
