import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create UserProject junction table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserProject" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "UserProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "UserProject_userId_projectId_key" ON "UserProject"("userId", "projectId")`);

  // Create SalesManager table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalesManager" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "teamLeadId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SalesManager_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SalesManager_name_teamLeadId_key" ON "SalesManager"("name", "teamLeadId")`);

  // Recreate Entry table with new structure
  // First drop old entries (fresh start since schema changed significantly)
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "CancelDetail"`);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Entry"`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "Entry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "salesManagerId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "periodStart" DATETIME NOT NULL,
      "periodEnd" DATETIME NOT NULL,
      "year" INTEGER NOT NULL,
      "month" INTEGER NOT NULL,
      "half" INTEGER NOT NULL,
      "siteVisits" INTEGER NOT NULL DEFAULT 0,
      "bookings" INTEGER NOT NULL DEFAULT 0,
      "cancellations" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Entry_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "SalesManager" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Entry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Entry_salesManagerId_projectId_year_month_half_key" ON "Entry"("salesManagerId", "projectId", "year", "month", "half")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "CancelDetail" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "entryId" TEXT NOT NULL,
      "count" INTEGER NOT NULL,
      "bookedYear" INTEGER NOT NULL,
      "bookedMonth" INTEGER NOT NULL,
      "bookedHalf" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CancelDetail_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  // Remove old projectId column from User (SQLite can't drop columns easily, just leave it)
  console.log("Migration v2 completed successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
