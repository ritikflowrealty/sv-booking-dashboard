import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getPeriodLabel } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");

  const where: Record<string, unknown> = {};
  if (year) where.year = parseInt(year);

  const entries = await prisma.entry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      cancelDetails: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { half: "desc" }],
  });

  const formatted = entries.map((entry) => ({
    ...entry,
    periodLabel: getPeriodLabel(entry.year, entry.month, entry.half),
  }));

  return NextResponse.json(formatted);
}
