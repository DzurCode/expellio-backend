-- CreateEnum
CREATE TYPE "HouseholdMode" AS ENUM ('individual', 'couple');

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('expense', 'income', 'both');

-- CreateEnum
CREATE TYPE "BudgetPeriodType" AS ENUM ('weekly', 'biweekly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('expense', 'income', 'transfer');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'debit_card', 'credit_card', 'bank_transfer', 'digital_wallet', 'other');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('manual', 'voice', 'photo', 'ai_suggestion', 'recurring_auto');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "SavingsGoalStatus" AS ENUM ('active', 'completed', 'paused', 'cancelled');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('voice_transcription', 'photo_parsing', 'expense_analysis', 'weekly_summary', 'categorization');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('budget_alert', 'goal_milestone', 'goal_completed', 'ai_complete', 'household_invite', 'weekly_summary', 'recurring_created', 'system');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'restore');

-- CreateTable
CREATE TABLE "currencies" (
    "id" UUID NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "decimalPlaces" SMALLINT NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(150) NOT NULL,
    "avatarUrl" TEXT,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en-US',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMPTZ,
    "deletionScheduledAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "mode" "HouseholdMode" NOT NULL,
    "currencyId" UUID NOT NULL,
    "inviteCode" VARCHAR(64),
    "inviteExpiresAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "HouseholdRole" NOT NULL,
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "householdId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "type" "CategoryType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" SMALLINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "amountLimit" DECIMAL(19,4) NOT NULL,
    "periodType" "BudgetPeriodType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "alertThresholdPct" SMALLINT NOT NULL DEFAULT 80,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_alerts" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "thresholdPctReached" SMALLINT NOT NULL,
    "currentSpent" DECIMAL(19,4) NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "triggeredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "budget_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "recurringConfigId" UUID,
    "aiJobId" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "description" VARCHAR(500),
    "notes" TEXT,
    "transactionDate" DATE NOT NULL,
    "paymentMethod" "PaymentMethod",
    "source" "TransactionSource" NOT NULL DEFAULT 'manual',
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_splits" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "transaction_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_configs" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "description" VARCHAR(500),
    "paymentMethod" "PaymentMethod",
    "frequency" "RecurringFrequency" NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "totalOccurrences" SMALLINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "recurring_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL(19,4) NOT NULL,
    "currentAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "targetDate" DATE,
    "status" "SavingsGoalStatus" NOT NULL DEFAULT 'active',
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_contributions" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "note" VARCHAR(255),
    "contributedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "initiatedByUserId" UUID NOT NULL,
    "jobType" "AiJobType" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'queued',
    "userIntent" VARCHAR(255),
    "resultSummary" VARCHAR(500),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_weekly_summaries" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "aiJobId" UUID,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "summaryText" TEXT NOT NULL,
    "keyInsights" JSONB,
    "totalIncome" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "ai_weekly_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "householdId" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "relatedEntityType" VARCHAR(30),
    "relatedEntityId" UUID,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ,
    "isPushed" BOOLEAN NOT NULL DEFAULT false,
    "pushedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "householdId" UUID,
    "userId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "changes" JSONB NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "used_refresh_tokens" (
    "id" UUID NOT NULL,
    "jti" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "used_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "idx_currencies_active" ON "currencies"("isActive");

-- CreateIndex
CREATE INDEX "idx_users_deletion_scheduled" ON "users"("deletionScheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "households_inviteCode_key" ON "households"("inviteCode");

-- CreateIndex
CREATE INDEX "idx_households_mode" ON "households"("mode");

-- CreateIndex
CREATE INDEX "idx_households_currency" ON "households"("currencyId");

-- CreateIndex
CREATE INDEX "idx_hm_user_id" ON "household_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_household_members_household_user" ON "household_members"("householdId", "userId");

-- CreateIndex
CREATE INDEX "idx_categories_household" ON "categories"("householdId");

-- CreateIndex
CREATE INDEX "idx_categories_type" ON "categories"("type");

-- CreateIndex
CREATE INDEX "idx_categories_system" ON "categories"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "uq_categories_household_name" ON "categories"("householdId", "name");

-- CreateIndex
CREATE INDEX "idx_budgets_household_active" ON "budgets"("householdId", "isActive");

-- CreateIndex
CREATE INDEX "idx_budgets_category" ON "budgets"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_budgets_household_category_period" ON "budgets"("householdId", "categoryId", "periodType", "startDate");

-- CreateIndex
CREATE INDEX "idx_ba_household" ON "budget_alerts"("householdId");

-- CreateIndex
CREATE INDEX "idx_ba_triggered_at" ON "budget_alerts"("triggeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_budget_alerts_budget_threshold_period" ON "budget_alerts"("budgetId", "thresholdPctReached", "periodStart");

-- CreateIndex
CREATE INDEX "idx_txn_household_date" ON "transactions"("householdId", "transactionDate" DESC);

-- CreateIndex
CREATE INDEX "idx_txn_household_category" ON "transactions"("householdId", "categoryId");

-- CreateIndex
CREATE INDEX "idx_txn_household_type_date" ON "transactions"("householdId", "type", "transactionDate");

-- CreateIndex
CREATE INDEX "idx_txn_created_by" ON "transactions"("createdByUserId");

-- CreateIndex
CREATE INDEX "idx_txn_recurring_config" ON "transactions"("recurringConfigId");

-- CreateIndex
CREATE INDEX "idx_txn_source" ON "transactions"("source");

-- CreateIndex
CREATE INDEX "idx_txn_ai_job" ON "transactions"("aiJobId");

-- CreateIndex
CREATE INDEX "idx_ts_user_id" ON "transaction_splits"("userId");

-- CreateIndex
CREATE INDEX "idx_ts_unsettled" ON "transaction_splits"("transactionId", "isSettled");

-- CreateIndex
CREATE UNIQUE INDEX "uq_transaction_splits_txn_user" ON "transaction_splits"("transactionId", "userId");

-- CreateIndex
CREATE INDEX "idx_rc_household" ON "recurring_configs"("householdId");

-- CreateIndex
CREATE INDEX "idx_rc_created_by" ON "recurring_configs"("createdByUserId");

-- CreateIndex
CREATE INDEX "idx_rc_category" ON "recurring_configs"("categoryId");

-- CreateIndex
CREATE INDEX "idx_rc_active_dates" ON "recurring_configs"("householdId", "isActive", "toDate");

-- CreateIndex
CREATE INDEX "idx_sg_household_status" ON "savings_goals"("householdId", "status");

-- CreateIndex
CREATE INDEX "idx_gc_goal_id" ON "goal_contributions"("goalId", "contributedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_gc_user_id" ON "goal_contributions"("userId");

-- CreateIndex
CREATE INDEX "idx_ai_household_type" ON "ai_jobs"("householdId", "jobType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_user" ON "ai_jobs"("initiatedByUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_status" ON "ai_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_weekly_summaries_aiJobId_key" ON "ai_weekly_summaries"("aiJobId");

-- CreateIndex
CREATE INDEX "idx_aws_household_date" ON "ai_weekly_summaries"("householdId", "weekStartDate" DESC);

-- CreateIndex
CREATE INDEX "idx_aws_unread" ON "ai_weekly_summaries"("householdId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "uq_aws_household_week" ON "ai_weekly_summaries"("householdId", "weekStartDate");

-- CreateIndex
CREATE INDEX "idx_notif_user_unread" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_notif_household" ON "notifications"("householdId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_notif_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_log"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_household" ON "audit_log"("householdId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_log"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "used_refresh_tokens_jti_key" ON "used_refresh_tokens"("jti");

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurringConfigId_fkey" FOREIGN KEY ("recurringConfigId") REFERENCES "recurring_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "ai_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_configs" ADD CONSTRAINT "recurring_configs_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_configs" ADD CONSTRAINT "recurring_configs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_configs" ADD CONSTRAINT "recurring_configs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "savings_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_weekly_summaries" ADD CONSTRAINT "ai_weekly_summaries_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_weekly_summaries" ADD CONSTRAINT "ai_weekly_summaries_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "ai_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;
