import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, projectIds } = await req.json();

  // Verify ownership
  if (session.user.role === "team_lead") {
    const sm = await prisma.salesManager.findUnique({ where: { id } });
    if (!sm || sm.teamLeadId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;

  await prisma.salesManager.update({ where: { id }, data: updateData });

  // Update project assignments
  if (projectIds !== undefined) {
    await prisma.salesManagerProject.deleteMany({ where: { salesManagerId: id } });
    if (projectIds.length > 0) {
      await prisma.salesManagerProject.createMany({
        data: projectIds.map((pid: string) => ({
          id: crypto.randomUUID(),
          salesManagerId: id,
          projectId: pid,
        })),
      });
    }
  }

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.role === "team_lead") {
    const sm = await prisma.salesManager.findUnique({ where: { id } });
    if (!sm || sm.teamLeadId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await prisma.salesManager.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
