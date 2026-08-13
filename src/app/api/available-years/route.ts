import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where: Record<string, unknown> = {};
  if (session.user.role === "team_lead") {
    where.salesManager = { teamLeadId: session.user.id };
  }

  const entries = await prisma.entry.findMany({
    where,
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "asc" },
  });

  const years = entries.map((e) => e.year);

  // Always include current year even if no data yet
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.push(currentYear);

  return NextResponse.json(years.sort());
}
