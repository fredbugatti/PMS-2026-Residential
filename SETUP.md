# 🚀 Sanprinon Lite - Setup Instructions

Get your property management ledger running in **under 30 minutes**.

## Prerequisites

Make sure you have installed:
- **Node.js 20+** (`node --version`)
- **PostgreSQL 15+** (`psql --version`)
- **npm or pnpm**

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up PostgreSQL Database

### Option A: Using Homebrew (Mac)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb property_management
```

### Option B: Using Docker

```bash
docker run --name pms-postgres \
  -e POSTGRES_DB=property_management \
  -e POSTGRES_USER=pms_user \
  -e POSTGRES_PASSWORD=pms_pass \
  -p 5432:5432 \
  -d postgres:15
```

## Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/property_management"
```

**Example for local development:**
```bash
DATABASE_URL="postgresql://your_username@localhost:5432/property_management"
```

**Example for Docker:**
```bash
DATABASE_URL="postgresql://pms_user:pms_pass@localhost:5432/property_management"
```

## Step 4: Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Seed baseline data (5 accounts)
npx prisma db seed
```

## Step 5: Start the Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 🎉 You're Ready!

Your ledger is now running. Try posting your first entry:

1. Click **"New Entry"**
2. Select **"1200 - Accounts Receivable"**
3. Choose **"Debit"** (DR)
4. Enter amount: **$2000**
5. Description: **"Rent charge - Bay 1"**
6. Click **"Post Entry"**

The entry will appear in the Recent Entries table, and the balance will update instantly.

---

## Test the Full Rent Cycle

Post these 4 entries to simulate a full rent charge + payment:

### Entry 1: Charge Rent (Debit AR)
- Account: **1200** (AR)
- Type: **DR**
- Amount: **$2000**
- Description: **"Rent charge - Bay 1 - Jan 2026"**

### Entry 2: Record Income (Credit Income)
- Account: **4000** (Rental Income)
- Type: **CR**
- Amount: **$2000**
- Description: **"Rent charge - Bay 1 - Jan 2026"**

### Entry 3: Receive Payment (Debit Cash)
- Account: **1000** (Cash)
- Type: **DR**
- Amount: **$2000**
- Description: **"Payment received - Bay 1 - Check 1234"**

### Entry 4: Clear AR (Credit AR)
- Account: **1200** (AR)
- Type: **CR**
- Amount: **$2000**
- Description: **"Payment received - Bay 1 - Check 1234"**

**Result:** AR balance = $0, Cash balance = $2000, Income = $2000 ✅

---

## Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL is running
brew services list  # Mac
docker ps  # Docker

# Test connection
psql property_management
```

### Prisma Client Not Generated
```bash
npx prisma generate
```

### Port 3000 Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### View Database in Prisma Studio
```bash
npx prisma studio
```
Opens visual database editor at http://localhost:5555

---

## Next Steps (After Weekend)

**Week 2:** Add balance derivation queries
**Week 3:** Add simple lease table (promote strings to FK)
**Week 4:** Add recurring charges automation

---

## Need Help?

1. Check database is running: `psql property_management`
2. Check logs in terminal where `npm run dev` is running
3. View raw data: `npx prisma studio`

**You now have a production-ready ledger foundation!** 🎉
