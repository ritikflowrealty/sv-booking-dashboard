import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalesManagerProject" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "salesManagerId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SalesManagerProject_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "SalesManager" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "SalesManagerProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "SalesManagerProject_salesManagerId_projectId_key" 
    ON "SalesManagerProject"("salesManagerId", "projectId")
  `);

  console.log("Migration v3 completed - SalesManagerProject table created!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
