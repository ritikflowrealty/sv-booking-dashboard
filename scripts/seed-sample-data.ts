import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const salesManagers = await prisma.salesManager.findMany({
    include: { salesManagerProjects: { include: { project: true } } },
  });

  if (salesManagers.length === 0) {
    console.log("No sales managers found.");
    return;
  }

  // Data for 2025 (Jul-Dec) and 2026 (Jan-Aug)
  const periods = [
    // 2025 H2
    { year: 2025, month: 7, half: 1 }, { year: 2025, month: 7, half: 2 },
    { year: 2025, month: 8, half: 1 }, { year: 2025, month: 8, half: 2 },
    { year: 2025, month: 9, half: 1 }, { year: 2025, month: 9, half: 2 },
    { year: 2025, month: 10, half: 1 }, { year: 2025, month: 10, half: 2 },
    { year: 2025, month: 11, half: 1 }, { year: 2025, month: 11, half: 2 },
    { year: 2025, month: 12, half: 1 }, { year: 2025, month: 12, half: 2 },
    // 2026
    { year: 2026, month: 1, half: 1 }, { year: 2026, month: 1, half: 2 },
    { year: 2026, month: 2, half: 1 }, { year: 2026, month: 2, half: 2 },
    { year: 2026, month: 3, half: 1 }, { year: 2026, month: 3, half: 2 },
    { year: 2026, month: 4, half: 1 }, { year: 2026, month: 4, half: 2 },
    { year: 2026, month: 5, half: 1 }, { year: 2026, month: 5, half: 2 },
    { year: 2026, month: 6, half: 1 }, { year: 2026, month: 6, half: 2 },
    { year: 2026, month: 7, half: 1 }, { year: 2026, month: 7, half: 2 },
    { year: 2026, month: 8, half: 1 },
  ];

  const bookingLedger = new Map<string, number>();
  let created = 0;

  for (const sm of salesManagers) {
    // Create entries for ALL assigned projects
    for (const assignment of sm.salesManagerProjects) {
      const projectId = assignment.projectId;

      for (const period of periods) {
        const siteVisits = Math.floor(Math.random() * 18) + 8;
        const convRate = 0.15 + Math.random() * 0.25;
        const bookings = Math.max(1, Math.round(siteVisits * convRate));
        const hasCancellation = Math.random() < 0.12;
        const cancellations = hasCancellation ? (Math.random() < 0.75 ? 1 : 2) : 0;

        const periodStart = new Date(period.year, period.month - 1, period.half === 1 ? 1 : 16);
        const lastDay = new Date(period.year, period.month, 0).getDate();
        const periodEnd = new Date(period.year, period.month - 1, period.half === 1 ? 15 : lastDay);

        const ledgerKey = `${sm.id}-${projectId}-${period.year}-${period.month}-${period.half}`;
        bookingLedger.set(ledgerKey, bookings);

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

          if (cancellations > 0) {
            let cancelMonth = period.month - 1;
            let cancelYear = period.year;
            let cancelHalf = Math.random() > 0.5 ? 1 : 2;
            if (cancelMonth < 1) { cancelMonth = 12; cancelYear--; }

            const targetKey = `${sm.id}-${projectId}-${cancelYear}-${cancelMonth}-${cancelHalf}`;
            const targetBookings = bookingLedger.get(targetKey) || 0;

            if (targetBookings >= cancellations) {
              await prisma.cancelDetail.create({
                data: {
                  entryId: entry.id,
                  count: cancellations,
                  bookedYear: cancelYear,
                  bookedMonth: cancelMonth,
                  bookedHalf: cancelHalf,
                },
              });
              bookingLedger.set(targetKey, targetBookings - cancellations);
            }
          }

          created++;
        } catch {
          // Skip duplicates
        }
      }
    }
  }

  console.log(`✅ Created ${created} entries across all projects and sales managers.`);
  console.log(`   Period range: Jul 2025 - Aug 2026`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
