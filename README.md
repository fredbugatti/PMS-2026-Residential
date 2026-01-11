# Sanprinon Lite 🏢

**Professional Property Management Ledger System**

A beautiful, modern, ledger-first property management system built with Next.js, Prisma, and PostgreSQL.

![Sanprinon Dashboard](https://img.shields.io/badge/Status-MVP-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

## ✨ Features

- **Immutable Ledger** - Single source of truth, append-only
- **Idempotency** - Safe to retry, prevents double-posting
- **Real-time Balances** - Derived from ledger, never stored
- **Modern UI** - Clean, professional design with smooth animations
- **Type-Safe** - Full TypeScript coverage
- **Production-Ready** - Database constraints, audit trail, validation

## 🚀 Quick Start

See [SETUP.md](./SETUP.md) for detailed instructions.

```bash
# 1. Install dependencies
npm install

# 2. Set up database
createdb property_management

# 3. Configure .env
echo 'DATABASE_URL="postgresql://USER@localhost:5432/property_management"' > .env

# 4. Run migrations & seed
npx prisma migrate dev --name init
npx prisma db seed

# 5. Start dev server
npm run dev
```

Visit **http://localhost:3000**

## 📊 Core Accounts

- **1000** - Operating Cash (Asset)
- **1200** - Accounts Receivable (Asset)
- **2100** - Security Deposits Held (Liability)
- **4000** - Rental Income (Income)
- **5000** - Expenses (Expense)

## 🎯 Design Philosophy

1. **Ledger-First** - All balances derived from immutable ledger
2. **Manual Control** - User controls all posting (no magic)
3. **Simple Start** - Core features first, automation later
4. **Forward-Compatible** - Built for future expansion

## 📁 Project Structure

```
sanprinon-lite/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed data (5 accounts)
├── src/
│   ├── app/
│   │   ├── page.tsx        # Dashboard UI
│   │   ├── layout.tsx      # Root layout
│   │   └── api/            # API routes
│   │       ├── entries/    # POST/GET entries
│   │       └── balances/   # GET balances
│   └── lib/
│       └── accounting.ts   # Core posting logic
├── SETUP.md                # Setup instructions
└── package.json
```

## 🔒 Safety Guarantees

- ✅ Idempotency prevents double-posting
- ✅ Database constraints enforce rules
- ✅ Amounts must be positive
- ✅ Accounts must exist
- ✅ All entries immutable (append-only)
- ✅ Audit trail on every entry

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL 15, Prisma ORM
- **Validation**: Zod (future), TypeScript types

## 📈 Roadmap

**Phase 0 (This Weekend)** ✅
- Manual ledger posting
- Real-time balance display
- Basic UI

**Phase 1 (Next Week)**
- Balance derivation queries
- Lease table with FK
- Statement generation

**Phase 2 (Week 3)**
- Recurring charges table
- Payment allocation
- Multi-step forms

**Phase 3 (Week 4+)**
- Job queue automation
- Stripe integration
- Email notifications

## 🤝 Contributing

This is a personal project, but feedback welcome!

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for property managers who value accuracy over automation**
