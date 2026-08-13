import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  if (session.user.role === "team_lead") {
    const manager = await prisma.salesManager.findUnique({ where: { id } });
    if (!manager || manager.teamLeadId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await prisma.salesManager.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
