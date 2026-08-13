import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface CSVRow {
  sales_manager: string;
  year: string;
  month: string;
  period: string;
  site_visits: string;
  bookings: string;
  cancellations: string;
  cancel_booked_year?: string;
  cancel_booked_month?: string;
  cancel_booked_period?: string;
  cancel_count?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows, projectId } = await req.json();

  if (!projectId || !rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: "Project and rows data required" }, { status: 400 });
  }

  // Get all sales managers for this team lead
  const teamLeadId = session.user.id;
  const salesManagers = await prisma.salesManager.findMany({
    where: session.user.role === "team_lead" ? { teamLeadId } : {},
  });
  const smMap = new Map(salesManagers.map((sm) => [sm.name.toLowerCase(), sm.id]));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row: CSVRow = rows[i];
    const rowNum = i + 2; // +2 for header row + 0-index

    const smName = row.sales_manager?.trim();
    if (!smName) { errors.push(`Row ${rowNum}: Missing sales manager name`); continue; }

    const smId = smMap.get(smName.toLowerCase());
    if (!smId) { errors.push(`Row ${rowNum}: Sales manager "${smName}" not found`); continue; }

    const year = parseInt(row.year);
    const month = parseInt(row.month);
    const half = parseInt(row.period);
    const siteVisits = parseInt(row.site_visits) || 0;
    const bookings = parseInt(row.bookings) || 0;
    const cancellations = parseInt(row.cancellations) || 0;

    if (!year || !month || !half) { errors.push(`Row ${rowNum}: Invalid period`); continue; }
    if (month < 1 || month > 12) { errors.push(`Row ${rowNum}: Month must be 1-12`); continue; }
    if (half !== 1 && half !== 2) { errors.push(`Row ${rowNum}: Period must be 1 or 2`); continue; }

    const periodStart = new Date(year, month - 1, half === 1 ? 1 : 16);
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = new Date(year, month - 1, half === 1 ? 15 : lastDay);

    try {
      const existing = await prisma.entry.findUnique({
        where: { salesManagerId_projectId_year_month_half: { salesManagerId: smId, projectId, year, month, half } },
      });

      const entry = await prisma.entry.upsert({
        where: { salesManagerId_projectId_year_month_half: { salesManagerId: smId, projectId, year, month, half } },
        update: { siteVisits, bookings, cancellations },
        create: { salesManagerId: smId, projectId, year, month, half, periodStart, periodEnd, siteVisits, bookings, cancellations },
      });

      if (existing) updated++; else created++;

      // Handle cancellation details
      await prisma.cancelDetail.deleteMany({ where: { entryId: entry.id } });
      if (cancellations > 0 && row.cancel_count && parseInt(row.cancel_count) > 0) {
        const cancelCount = parseInt(row.cancel_count);
        const cancelYear = parseInt(row.cancel_booked_year || row.year);
        const cancelMonth = parseInt(row.cancel_booked_month || row.month);
        const cancelHalf = parseInt(row.cancel_booked_period || "1");

        await prisma.cancelDetail.create({
          data: {
            entryId: entry.id,
            count: cancelCount,
            bookedYear: cancelYear,
            bookedMonth: cancelMonth,
            bookedHalf: cancelHalf,
          },
        });
      }
    } catch (e) {
      errors.push(`Row ${rowNum}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ created, updated, errors, total: rows.length });
}
