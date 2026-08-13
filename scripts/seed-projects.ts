import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

const projectsData = [
  { developer: "Sipani Properties", project: "Sipani City", location: "Bangalore" },
  { developer: "Sparkle Realty", project: "Atmos", location: "Bangalore" },
  { developer: "Sumadhura", project: "Pramoda", location: "Bangalore" },
  { developer: "Geown", project: "Tranquil", location: "Bangalore" },
  { developer: "Meenakshi Group", project: "Pearl", location: "Bangalore" },
  { developer: "Sumadhura", project: "Epitome", location: "Bangalore" },
  { developer: "Sumadhura", project: "Solea", location: "Bangalore" },
  { developer: "PurpleBrick", project: "Avenue Garden", location: "Mysore" },
  { developer: "Beyond Acres", project: "Unstoppable 2.0", location: "Mysore" },
  { developer: "UKN Realty", project: "Miraya Woods", location: "Bangalore" },
  { developer: "UKN Realty", project: "Belvedere", location: "Bangalore" },
  { developer: "Sipani Properties", project: "Sipani Royal Heritage", location: "Bangalore" },
];

async function main() {
  for (const item of projectsData) {
    // Upsert developer
    let developer = await prisma.developer.findUnique({ where: { name: item.developer } });
    if (!developer) {
      developer = await prisma.developer.create({
        data: { name: item.developer, location: item.location },
      });
      console.log(`Created developer: ${developer.name}`);
    }

    // Create project
    try {
      await prisma.project.create({
        data: {
          name: item.project,
          developerId: developer.id,
          location: item.location,
        },
      });
      console.log(`  Created project: ${item.project}`);
    } catch {
      console.log(`  Project already exists: ${item.project}`);
    }
  }

  console.log("\nAll projects seeded!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
