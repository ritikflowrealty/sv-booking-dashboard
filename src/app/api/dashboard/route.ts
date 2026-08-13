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
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = { year };
  if (userId && session.user.role === "admin") {
    where.userId = userId;
  } else if (session.user.role === "sales_manager") {
    where.userId = session.user.id;
  }

  // Get all entries for the year
  const entries = await prisma.entry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      cancelDetails: true,
    },
    orderBy: [{ month: "asc" }, { half: "asc" }],
  });

  // Get all cancel details that affect this year's data
  const cancelDetailsAffecting = await prisma.cancelDetail.findMany({
    where: {
      bookedYear: year,
    },
    include: {
      entry: {
        select: { year: true, month: true, half: true },
      },
    },
  });

  // Calculate net bookings per period (bookings minus cancellations from later periods)
  const periodData = entries.map((entry) => {
    const cancellationsFromThisPeriod = cancelDetailsAffecting
      .filter(
        (cd) =>
          cd.bookedMonth === entry.month && cd.bookedHalf === entry.half
      )
      .reduce((sum, cd) => sum + cd.count, 0);

    return {
      ...entry,
      netBookings: entry.bookings - cancellationsFromThisPeriod,
      cancellationsDeducted: cancellationsFromThisPeriod,
    };
  });

  // Summary stats
  const totalSV = entries.reduce((sum, e) => sum + e.siteVisits, 0);
  const totalBookings = entries.reduce((sum, e) => sum + e.bookings, 0);
  const totalCancellations = entries.reduce((sum, e) => sum + e.cancellations, 0);
  const totalNetBookings = periodData.reduce((sum, e) => sum + e.netBookings, 0);
  const conversionRate = totalSV > 0 ? ((totalBookings / totalSV) * 100).toFixed(1) : "0";

  return NextResponse.json({
    entries: periodData,
    summary: {
      totalSV,
      totalBookings,
      totalCancellations,
      totalNetBookings,
      conversionRate,
    },
  });
}
