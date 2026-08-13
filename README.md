# SV and Booking Dashboard

Site Visit and Booking Management Dashboard for Ritik Flow Realty.

## Features

- Role-based access (Admin, Sales Manager)
- 15-day period based data entry (1st-15th, 16th-end of month)
- Site Visits, Bookings, and Cancellations tracking
- Cancellation deduction from original booking period
- Interactive charts and analytics
- User management for admins

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Prisma with SQLite
- NextAuth.js (Credentials)
- Recharts
- Tailwind CSS

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Push database schema:
```bash
npx prisma db push
```

4. Seed admin user:
```bash
npm run seed
```

5. Run development server:
```bash
npm run dev
```

## Default Admin Login

- Email: admin@ritikflow.com
- Password: admin123

## Deployment on Vercel

1. Push to GitHub
2. Connect repo on Vercel
3. Add environment variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
4. Deploy

For production, use a hosted database (Vercel Postgres, PlanetScale, etc.) instead of SQLite.
