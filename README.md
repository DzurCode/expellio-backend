# Expellio Backend

Welcome to the backend service of **Expellio**, an intelligent expense and income management application designed for individual and couple mode financial tracking. This application is built with a focus on strict multi-tenancy, relational database normalization (3NF), robust AI job auditing, and strict NestJS/Prisma architectural patterns.

---

## 🚀 Technology Stack

- **Framework:** NestJS (TypeScript strict mode)
- **Database ORM:** Prisma Client
- **Database:** PostgreSQL
- **Validation:** `class-validator` + `class-transformer`
- **Documentation:** Swagger OpenAPI (`@nestjs/swagger`)
- **Testing:** Jest + `@nestjs/testing`

---

## 🏛️ Architecture & Rules

This project adheres to the strict guidelines outlined in our design system:
1. **Try-Catch Encapsulation:** Feature services wrap database actions in `try-catch` blocks, intercepting Prisma error codes (like `P2002` duplicate key or `P2025` not found) and mapping them into native NestJS HTTP Exceptions (`ConflictException`, `NotFoundException`).
2. **Controller Decoupling:** Controllers only parse requests, validate DTO payloads, and delegate all business logic to service layers.
3. **Multi-Tenancy Isolation:** Data is strictly isolated by `householdId` (the multi-tenant boundary). Feature modules query database entries specifying the household scope.
4. **Soft Deletion & Account Deletion Grace Period:** 
   - Entities have `deletedAt` for soft deletes.
   - When a household owner schedules account deletion (`deletionScheduledAt`), the account enters a 30-day grace period, after which the data is hard-deleted from the database.
5. **Validation & Swagger Integration:** All incoming request DTOs are decorated with validation rules (`class-validator`) and Swagger annotations (`@ApiProperty`) to automatically construct OpenAPI documents.

---

## 🔐 Authentication & Security

The application implements a secure authentication system in the `src/auth/` module, featuring:

1. **Password Hashing:** Passwords are never stored in plain text. They are hashed using `bcrypt` and verified during login using `bcrypt.compare`.
2. **Brute-Force & Lockout Protection:** 
   - Login attempts are monitored (`failedLoginAttempts`).
   - If a threshold (`maxFailedAttempts`) is reached, the user account is locked (`lockedUntil`) for a configurable duration.
3. **Timing Attack Protection:** 
   - To prevent attackers from discovering existing email addresses via timing analysis, if a user profile is not found for a given email, the service executes a dummy `bcrypt.compare` operation against a configuration-provided `dummyHash` to match the computational delay of a normal hashing check.
4. **Dual-Token System (JWT):** 
   - **Access Token:** Short-lived JWT containing basic user details (`sub`, `email`).
   - **Refresh Token:** Long-lived JWT containing a unique token identifier (`jti`).
5. **Stateful Refresh Token Rotation (RTR):** 
   - A stateful refresh rotation approach is employed to detect and mitigate replay attacks.
   - When a refresh token is used to obtain a new set of tokens, its `jti` is written to the `UsedRefreshToken` table.
   - If a malicious actor reuses an old refresh token, it will be flagged as already used, causing the request to fail.

---

## 📊 Database Schema (Prisma Models)

The PostgreSQL database contains **16 core tables** (plus 1 authentication helper registry) mapping the financial relationships:

### 1. Reference Data
* **`Currency` (`currencies`):** Stores ISO 4217 currency references (e.g., USD, EUR). Each household picks exactly one reference currency to avoid conversion overhead in this version.

### 2. Identity & Multi-Tenancy
* **`User` (`users`):** Individual user profile, credentials (password hash), and locales. Supports soft-delete scheduling via `deletionScheduledAt`.
* **`Household` (`households`):** The primary multi-tenant boundary representing a financial container. Operates in either `individual` or `couple` mode.
* **`HouseholdMember` (`household_members`):** Junction table mapping users to households with specific roles (`owner`, `member`).

### 3. Categories & Budgeting
* **`Category` (`categories`):** A flat category tree containing system-wide default categories (e.g., Food, Utilities) and user-created custom categories.
* **`Budget` (`budgets`):** Periodic spending or income limits defined per category, period (weekly, monthly, etc.), and household.
* **`BudgetAlert` (`budget_alerts`):** Stores history of triggered budget thresholds (e.g., reaching 80% or 100% of limits) to prevent repeated alerts in the same period.

### 4. Transactions & Recurring Configs
* **`Transaction` (`transactions`):** The primary transaction ledger. Tracks amounts, dates, payment methods, transaction types (`expense`, `income`, `transfer`), and origins (`manual`, `voice`, `photo`, `ai_suggestion`, `recurring_auto`).
* **`TransactionSplit` (`transaction_splits`):** Used in `couple` mode. Holds responsibility records between partners (form defaults to 50/50 splits) to settle balances.
* **`RecurringConfig` (`recurring_configs`):** Templates for scheduled recurring transactions. Updates to a template (like modifying the amount or category) automatically cascade to future auto-generated instances.

### 5. Savings Goals
* **`SavingsGoal` (`savings_goals`):** Shared or individual targets (e.g., a trip or emergency fund) tracking accumulated amounts towards a deadline.
* **`GoalContribution` (`goal_contributions`):** Transactions specifically dedicated to deposits or withdrawals from a savings goal.

### 6. AI Operations & Logs
* **`AiJob` (`ai_jobs`):** Background process logs representing user-initiated AI functions (e.g. voice transcription, receipt photo parsing, monthly summaries). Contains auditing metadata and error logs.
* **`AiWeeklySummary` (`ai_weekly_summaries`):** Dynamic, conversational summaries of household financials generated weekly by AI.

### 7. Notifications & Auditing
* **`Notification` (`notifications`):** User notifications for budget breaches, goal completions, recurring configurations, and invitation updates.
* **`AuditLog` (`audit_log`):** An immutable, **append-only** audit ledger tracking all CRUD actions across the application. Updates and deletes are not permitted on this table.
* **`UsedRefreshToken` (`used_refresh_tokens`):** Auth helper tracking rotated refresh tokens to detect reuse and prevent replay attacks.

---

## 📂 Project Structure

```
src/
├── ai-jobs/              # AI background task logs
├── audit-log/            # Append-only immutable ledger
├── budgets/              # Spending limits and category alerts
├── categories/           # Standard and custom categories
├── config/               # App and database configuration
├── currencies/           # Currency definition table
├── households/           # Multi-tenant groups (individual/couple)
├── notifications/        # User alert system
├── prisma/               # Global PrismaService instance
├── recurring-configs/    # Templates for scheduled transactions
├── savings-goals/        # Individual/Shared savings targets
├── transactions/         # Expense/Income ledger and split tracking
├── users/                # Identity management
├── app.module.ts         # Central Module importing all features
└── main.ts               # App entrypoint (Swagger and Global Pipes)
```

---

## 🔧 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL instance running

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/expellio?schema=public"
PORT=3000
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database
Run migrations to set up the 16 tables:
```bash
npx prisma migrate dev --name init
```

### 5. Run the Application
```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### 6. Run Unit Tests
```bash
# Run all tests
npm run test

# Run tests with coverage reporting
npm run test:cov
```
