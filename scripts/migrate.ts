import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create tables using raw SQL
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Developer" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "location" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Developer_name_key" ON "Developer"("name")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Project" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "developerId" TEXT NOT NULL,
      "location" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Project_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Project_name_developerId_key" ON "Project"("name", "developerId")
  `);

  // Add projectId to User table
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "projectId" TEXT`);
  } catch (e: unknown) {
    const error = e as Error;
    if (!error.message?.includes("duplicate column")) console.log("projectId column may already exist");
  }

  // Add projectId to Entry table  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Entry" ADD COLUMN "projectId" TEXT`);
  } catch (e: unknown) {
    const error = e as Error;
    if (!error.message?.includes("duplicate column")) console.log("projectId column may already exist");
  }

  // Drop old unique constraint and create new one
  // SQLite doesn't support dropping constraints, so we'll just create the new index if it doesn't exist
  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Entry_userId_projectId_year_month_half_key" 
      ON "Entry"("userId", "projectId", "year", "month", "half")
    `);
  } catch {
    console.log("Index may already exist");
  }

  console.log("Migration completed successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
