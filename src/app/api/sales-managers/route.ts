import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where: Record<string, unknown> = {};
  if (session.user.role === "team_lead") {
    where.teamLeadId = session.user.id;
  }

  const managers = await prisma.salesManager.findMany({
    where,
    include: {
      teamLead: { select: { id: true, name: true } },
      _count: { select: { entries: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(managers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const teamLeadId = session.user.id;

  try {
    const manager = await prisma.salesManager.create({
      data: { name, teamLeadId },
    });
    return NextResponse.json(manager);
  } catch {
    return NextResponse.json(
      { error: "Sales manager with this name already exists under your team" },
      { status: 400 }
    );
  }
}
