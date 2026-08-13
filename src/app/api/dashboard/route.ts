import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  // Support multi-year: "2026" or "2026,2027"
  const yearsParam = searchParams.get("years") || searchParams.get("year") || new Date().getFullYear().toString();
  const years = yearsParam.split(",").map((y) => parseInt(y.trim()));
  const projectId = searchParams.get("projectId");
  const salesManagerId = searchParams.get("salesManagerId");
  // Month range filter: "1,2,3" or "1-6" or empty for all
  const monthsParam = searchParams.get("months");

  let monthFilter: number[] | null = null;
  if (monthsParam) {
    if (monthsParam.includes("-")) {
      const [start, end] = monthsParam.split("-").map(Number);
      monthFilter = [];
      for (let m = start; m <= end; m++) monthFilter.push(m);
    } else {
      monthFilter = monthsParam.split(",").map(Number);
    }
  }

  const where: Record<string, unknown> = { year: { in: years } };
  if (projectId) where.projectId = projectId;
  if (salesManagerId) where.salesManagerId = salesManagerId;
  if (monthFilter) where.month = { in: monthFilter };

  // Team leads can only see their own sales managers' entries
  if (session.user.role === "team_lead") {
    where.salesManager = { teamLeadId: session.user.id };
  }

  const entries = await prisma.entry.findMany({
    where,
    include: {
      salesManager: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, developer: { select: { id: true, name: true } } } },
      cancelDetails: true,
    },
    orderBy: [{ year: "asc" }, { month: "asc" }, { half: "asc" }],
  });

  // Get cancel details that affect these years' data
  // A cancel detail "affects" an entry when the cancel was booked in that entry's period
  const cancelDetailsAffecting = await prisma.cancelDetail.findMany({
    where: { bookedYear: { in: years } },
    include: {
      entry: { select: { year: true, month: true, half: true, projectId: true, salesManagerId: true } },
    },
  });

  const periodData = entries.map((entry) => {
    // Net bookings = bookings - cancellations that were originally booked in THIS period
    // Must also match projectId and salesManagerId for accuracy
    const cancellationsFromThisPeriod = cancelDetailsAffecting
      .filter(
        (cd) =>
          cd.bookedYear === entry.year &&
          cd.bookedMonth === entry.month &&
          cd.bookedHalf === entry.half &&
          cd.entry.projectId === entry.projectId
      )
      .reduce((sum, cd) => sum + cd.count, 0);

    return {
      ...entry,
      netBookings: entry.bookings - cancellationsFromThisPeriod,
      cancellationsDeducted: cancellationsFromThisPeriod,
    };
  });

  const totalSV = entries.reduce((sum, e) => sum + e.siteVisits, 0);
  const totalBookings = entries.reduce((sum, e) => sum + e.bookings, 0);
  const totalCancellations = entries.reduce((sum, e) => sum + e.cancellations, 0);
  const totalNetBookings = periodData.reduce((sum, e) => sum + e.netBookings, 0);
  const conversionRate = totalSV > 0 ? ((totalBookings / totalSV) * 100).toFixed(1) : "0";

  return NextResponse.json({
    entries: periodData,
    summary: { totalSV, totalBookings, totalCancellations, totalNetBookings, conversionRate },
  });
}
