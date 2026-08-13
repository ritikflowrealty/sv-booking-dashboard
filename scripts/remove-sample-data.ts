import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Delete all cancel details first (foreign key)
  const deletedCD = await prisma.cancelDetail.deleteMany();
  console.log(`Deleted ${deletedCD.count} cancel details`);

  // Delete all entries
  const deletedEntries = await prisma.entry.deleteMany();
  console.log(`Deleted ${deletedEntries.count} entries`);

  console.log("\n✅ All entry data removed. Projects, developers, team leads, and sales managers are preserved.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
