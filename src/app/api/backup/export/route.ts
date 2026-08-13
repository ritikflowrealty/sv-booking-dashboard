import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, developers, projects, userProjects, salesManagers, salesManagerProjects, entries, cancelDetails] =
    await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      prisma.developer.findMany(),
      prisma.project.findMany(),
      prisma.userProject.findMany(),
      prisma.salesManager.findMany(),
      prisma.salesManagerProject.findMany(),
      prisma.entry.findMany(),
      prisma.cancelDetail.findMany(),
    ]);

  const backup = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    exportedBy: session.user.email,
    data: {
      users,
      developers,
      projects,
      userProjects,
      salesManagers,
      salesManagerProjects,
      entries,
      cancelDetails,
    },
  };

  const filename = `flow-realty-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
