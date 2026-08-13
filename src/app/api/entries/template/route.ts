import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  // Get sales managers for this team lead
  const where: Record<string, unknown> = {};
  if (session.user.role === "team_lead") {
    where.teamLeadId = session.user.id;
  }

  const salesManagers = await prisma.salesManager.findMany({
    where,
    orderBy: { name: "asc" },
  });

  // Build CSV header and rows
  const headers = [
    "sales_manager",
    "year",
    "month",
    "period",
    "site_visits",
    "bookings",
    "cancellations",
    "cancel_count",
    "cancel_booked_year",
    "cancel_booked_month",
    "cancel_booked_period",
  ];

  // Create sample rows with each sales manager name pre-filled
  const rows = salesManagers.map((sm) => [
    sm.name,
    "", // year (e.g. 2026)
    "", // month (1-12)
    "", // period (1 = 1st-15th, 2 = 16th-End)
    "", // site_visits
    "", // bookings
    "", // cancellations
    "", // cancel_count (how many cancelled)
    "", // cancel_booked_year (year when originally booked)
    "", // cancel_booked_month (month when originally booked)
    "", // cancel_booked_period (1 or 2)
  ]);

  const csvContent = [
    headers.join(","),
    "# Instructions: Fill year (e.g. 2026) month (1-12) period (1=1st-15th or 2=16th-End)",
    "# site_visits bookings cancellations are numbers",
    "# If cancellations > 0 fill cancel_count cancel_booked_year cancel_booked_month cancel_booked_period",
    "# cancel_booked fields = when the cancelled units were originally booked",
    "# You can have multiple rows per sales manager for different cancellation sources",
    ...rows.map((r) => r.join(",")),
  ].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="sv-booking-template.csv"',
    },
  });
}
