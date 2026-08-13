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

  const where: Record<string, unknown> = {};
  if (session.user.role === "team_lead") {
    where.teamLeadId = session.user.id;
  }

  // If projectId filter is provided, only show SMs assigned to that project
  if (projectId) {
    where.salesManagerProjects = { some: { projectId } };
  }

  const managers = await prisma.salesManager.findMany({
    where,
    include: {
      teamLead: { select: { id: true, name: true } },
      salesManagerProjects: {
        include: { project: { select: { id: true, name: true, developer: { select: { name: true } } } } },
      },
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

  const { name, projectIds } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const teamLeadId = session.user.role === "admin" ? session.user.id : session.user.id;

  try {
    const manager = await prisma.salesManager.create({
      data: {
        name,
        teamLeadId,
        salesManagerProjects: {
          create: (projectIds || []).map((pid: string) => ({ projectId: pid })),
        },
      },
      include: {
        salesManagerProjects: {
          include: { project: { select: { id: true, name: true, developer: { select: { name: true } } } } },
        },
      },
    });
    return NextResponse.json(manager);
  } catch {
    return NextResponse.json(
      { error: "Sales manager with this name already exists under your team" },
      { status: 400 }
    );
  }
}
