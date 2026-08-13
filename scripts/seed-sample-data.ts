import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get all sales managers with their projects
  const salesManagers = await prisma.salesManager.findMany({
    include: {
      salesManagerProjects: { include: { project: true } },
    },
  });

  if (salesManagers.length === 0) {
    console.log("No sales managers found. Run seed-team2.ts first.");
    return;
  }

  // Sample data for periods: Jan-Jun 2026 (both halves)
  const periods = [
    { year: 2026, month: 1, half: 1 },
    { year: 2026, month: 1, half: 2 },
    { year: 2026, month: 2, half: 1 },
    { year: 2026, month: 2, half: 2 },
    { year: 2026, month: 3, half: 1 },
    { year: 2026, month: 3, half: 2 },
    { year: 2026, month: 4, half: 1 },
    { year: 2026, month: 4, half: 2 },
    { year: 2026, month: 5, half: 1 },
    { year: 2026, month: 5, half: 2 },
    { year: 2026, month: 6, half: 1 },
    { year: 2026, month: 6, half: 2 },
    { year: 2026, month: 7, half: 1 },
    { year: 2026, month: 7, half: 2 },
    { year: 2026, month: 8, half: 1 },
  ];

  let created = 0;

  for (const sm of salesManagers) {
    // Use first assigned project for each SM
    const projectAssignment = sm.salesManagerProjects[0];
    if (!projectAssignment) continue;

    const projectId = projectAssignment.projectId;

    for (const period of periods) {
      // Generate realistic random data
      const siteVisits = Math.floor(Math.random() * 20) + 5; // 5-25
      const bookings = Math.floor(Math.random() * Math.min(siteVisits, 8)) + 1; // 1-8 max
      const cancellations = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0; // 30% chance of 1-3

      const periodStart = new Date(period.year, period.month - 1, period.half === 1 ? 1 : 16);
      const lastDay = new Date(period.year, period.month, 0).getDate();
      const periodEnd = new Date(period.year, period.month - 1, period.half === 1 ? 15 : lastDay);

      try {
        const entry = await prisma.entry.create({
          data: {
            salesManagerId: sm.id,
            projectId,
            year: period.year,
            month: period.month,
            half: period.half,
            periodStart,
            periodEnd,
            siteVisits,
            bookings,
            cancellations,
          },
        });

        // Add cancel details if there are cancellations
        if (cancellations > 0) {
          // Cancelled from a previous period
          const prevMonth = period.month > 1 ? period.month - 1 : 12;
          const prevYear = period.month > 1 ? period.year : period.year - 1;
          await prisma.cancelDetail.create({
            data: {
              entryId: entry.id,
              count: cancellations,
              bookedYear: prevYear,
              bookedMonth: prevMonth,
              bookedHalf: Math.random() > 0.5 ? 1 : 2,
            },
          });
        }

        created++;
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Created ${created} sample entries across ${salesManagers.length} sales managers.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
