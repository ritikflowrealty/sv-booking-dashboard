import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where: Record<string, unknown> = {};
  if (session.user.role === "team_lead") where.teamLeadId = session.user.id;

  const deputies = await prisma.deputyTL.findMany({
    where,
    include: { teamLead: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(deputies);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const deputy = await prisma.deputyTL.create({
      data: { name, teamLeadId: session.user.id },
    });
    return NextResponse.json(deputy);
  } catch {
    return NextResponse.json({ error: "Deputy TL with this name already exists" }, { status: 400 });
  }
}
