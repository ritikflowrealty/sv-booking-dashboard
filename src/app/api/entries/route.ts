import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const half = searchParams.get("half");
  const userId = searchParams.get("userId");
  const projectId = searchParams.get("projectId");

  const where: Record<string, unknown> = {};
  if (year) where.year = parseInt(year);
  if (month) where.month = parseInt(month);
  if (half) where.half = parseInt(half);
  if (userId) where.userId = userId;
  if (projectId) where.projectId = projectId;

  // Team leads can only see their own entries
  if (session.user.role === "team_lead") {
    where.userId = session.user.id;
  }

  const entries = await prisma.entry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, developer: { select: { name: true } } } },
      cancelDetails: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { half: "desc" }],
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { year, month, half, siteVisits, bookings, cancellations, cancelDetails, userId, projectId } =
    await req.json();

  // Admin can create for any user, team lead only for themselves
  const targetUserId =
    session.user.role === "admin" && userId ? userId : session.user.id;

  // Calculate period dates
  const periodStart = new Date(year, month - 1, half === 1 ? 1 : 16);
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = new Date(year, month - 1, half === 1 ? 15 : lastDay);

  try {
    // Create or update the entry
    const entry = await prisma.entry.upsert({
      where: {
        userId_projectId_year_month_half: {
          userId: targetUserId,
          projectId: projectId || "",
          year,
          month,
          half,
        },
      },
      update: {
        siteVisits,
        bookings,
        cancellations,
      },
      create: {
        userId: targetUserId,
        projectId: projectId || null,
        year,
        month,
        half,
        periodStart,
        periodEnd,
        siteVisits,
        bookings,
        cancellations,
      },
    });

    // Handle cancel details
    if (cancellations > 0 && cancelDetails && cancelDetails.length > 0) {
      await prisma.cancelDetail.deleteMany({
        where: { entryId: entry.id },
      });

      await prisma.cancelDetail.createMany({
        data: cancelDetails.map(
          (detail: { count: number; bookedYear: number; bookedMonth: number; bookedHalf: number }) => ({
            entryId: entry.id,
            count: detail.count,
            bookedYear: detail.bookedYear,
            bookedMonth: detail.bookedMonth,
            bookedHalf: detail.bookedHalf,
          })
        ),
      });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}
