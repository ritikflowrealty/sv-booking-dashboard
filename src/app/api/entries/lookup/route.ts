import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Lookup existing entry for a specific SM + project + period
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const salesManagerId = searchParams.get("salesManagerId");
  const projectId = searchParams.get("projectId");
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const half = searchParams.get("half");

  if (!salesManagerId || !projectId || !year || !month || !half) {
    return NextResponse.json(null);
  }

  const entry = await prisma.entry.findUnique({
    where: {
      salesManagerId_projectId_year_month_half: {
        salesManagerId,
        projectId,
        year: parseInt(year),
        month: parseInt(month),
        half: parseInt(half),
      },
    },
    include: { cancelDetails: true },
  });

  return NextResponse.json(entry);
}
