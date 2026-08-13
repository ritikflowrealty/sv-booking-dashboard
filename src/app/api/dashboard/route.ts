import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const projectId = searchParams.get("projectId");
  const salesManagerId = searchParams.get("salesManagerId");

  const where: Record<string, unknown> = { year };
  if (projectId) where.projectId = projectId;
  if (salesManagerId) where.salesManagerId = salesManagerId;

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
    orderBy: [{ month: "asc" }, { half: "asc" }],
  });

  // Get cancel details that affect this year
  const cancelDetailsAffecting = await prisma.cancelDetail.findMany({
    where: { bookedYear: year },
    include: {
      entry: { select: { year: true, month: true, half: true, projectId: true } },
    },
  });

  const periodData = entries.map((entry) => {
    const cancellationsFromThisPeriod = cancelDetailsAffecting
      .filter(
        (cd) =>
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
