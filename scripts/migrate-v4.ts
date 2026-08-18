import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create DeputyTL table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DeputyTL" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "teamLeadId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DeputyTL_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "DeputyTL_name_teamLeadId_key" ON "DeputyTL"("name", "teamLeadId")`);

  // Add deputyTLId column to Entry
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Entry" ADD COLUMN "deputyTLId" TEXT`);
    console.log("Added deputyTLId to Entry");
  } catch {
    console.log("deputyTLId may already exist");
  }

  console.log("Migration v4 completed - DeputyTL table created!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
