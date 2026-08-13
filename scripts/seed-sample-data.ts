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

  // Realistic periods: Jan-Aug 2026
  const periods = [
    { year: 2026, month: 1, half: 1 }, { year: 2026, month: 1, half: 2 },
    { year: 2026, month: 2, half: 1 }, { year: 2026, month: 2, half: 2 },
    { year: 2026, month: 3, half: 1 }, { year: 2026, month: 3, half: 2 },
    { year: 2026, month: 4, half: 1 }, { year: 2026, month: 4, half: 2 },
    { year: 2026, month: 5, half: 1 }, { year: 2026, month: 5, half: 2 },
    { year: 2026, month: 6, half: 1 }, { year: 2026, month: 6, half: 2 },
    { year: 2026, month: 7, half: 1 }, { year: 2026, month: 7, half: 2 },
    { year: 2026, month: 8, half: 1 },
  ];

  // Track bookings per SM per project per period so cancellations never exceed them
  const bookingLedger = new Map<string, number>(); // "smId-projectId-year-month-half" -> bookings

  let created = 0;

  for (const sm of salesManagers) {
    const projectAssignment = sm.salesManagerProjects[0];
    if (!projectAssignment) continue;
    const projectId = projectAssignment.projectId;

    for (const period of periods) {
      // Realistic data: SV = 8-25, bookings = 15-40% of SV, cancellations = rare and small
      const siteVisits = Math.floor(Math.random() * 18) + 8;
      const convRate = 0.15 + Math.random() * 0.25; // 15-40% conversion
      const bookings = Math.max(1, Math.round(siteVisits * convRate));

      // Cancellations: only 15% chance, and max 1-2
      const hasCancellation = Math.random() < 0.15;
      const cancellations = hasCancellation ? (Math.random() < 0.7 ? 1 : 2) : 0;

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

        // Cancel details: point to a PREVIOUS period that had enough bookings
        if (cancellations > 0) {
          // Find a previous period that has bookings >= cancellations
          let cancelYear = period.year;
          let cancelMonth = period.month - 1;
          let cancelHalf = Math.random() > 0.5 ? 1 : 2;

          if (cancelMonth < 1) { cancelMonth = 12; cancelYear--; }

          // Make sure the target period had enough bookings
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
            // Reduce available bookings in ledger to prevent over-cancellation
            bookingLedger.set(targetKey, targetBookings - cancellations);
          } else {
            // If no valid previous period, just record cancellation without detail
            // (it won't deduct from any period's net bookings)
          }
        }

        created++;
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Created ${created} realistic entries.`);
  console.log(`   Cancellation logic: only deducts from periods that had enough bookings.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
