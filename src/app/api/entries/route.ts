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
  const projectId = searchParams.get("projectId");
  const salesManagerId = searchParams.get("salesManagerId");

  const where: Record<string, unknown> = {};
  if (year) where.year = parseInt(year);
  if (projectId) where.projectId = projectId;
  if (salesManagerId) where.salesManagerId = salesManagerId;

  // Team leads can only see entries from their sales managers
  if (session.user.role === "team_lead") {
    where.salesManager = { teamLeadId: session.user.id };
  }

  const entries = await prisma.entry.findMany({
    where,
    include: {
      salesManager: { select: { id: true, name: true, teamLeadId: true } },
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

  const { year, month, half, siteVisits, bookings, cancellations, cancelDetails, salesManagerId, projectId } =
    await req.json();

  if (!salesManagerId || !projectId) {
    return NextResponse.json({ error: "Sales Manager and Project are required" }, { status: 400 });
  }

  // Verify ownership for team lead
  if (session.user.role === "team_lead") {
    const sm = await prisma.salesManager.findUnique({ where: { id: salesManagerId } });
    if (!sm || sm.teamLeadId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const periodStart = new Date(year, month - 1, half === 1 ? 1 : 16);
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = new Date(year, month - 1, half === 1 ? 15 : lastDay);

  try {
    const entry = await prisma.entry.upsert({
      where: {
        salesManagerId_projectId_year_month_half: {
          salesManagerId,
          projectId,
          year,
          month,
          half,
        },
      },
      update: { siteVisits, bookings, cancellations },
      create: {
        salesManagerId,
        projectId,
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
      await prisma.cancelDetail.deleteMany({ where: { entryId: entry.id } });
      await prisma.cancelDetail.createMany({
        data: cancelDetails.map(
          (d: { count: number; bookedYear: number; bookedMonth: number; bookedHalf: number }) => ({
            entryId: entry.id, count: d.count, bookedYear: d.bookedYear, bookedMonth: d.bookedMonth, bookedHalf: d.bookedHalf,
          })
        ),
      });
    } else if (cancellations === 0) {
      await prisma.cancelDetail.deleteMany({ where: { entryId: entry.id } });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
