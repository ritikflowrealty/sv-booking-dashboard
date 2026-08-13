import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "admin") {
    // Admin sees all projects
    const projects = await prisma.project.findMany({
      include: { developer: { select: { name: true } } },
      orderBy: [{ developer: { name: "asc" } }, { name: "asc" }],
    });
    return NextResponse.json(projects);
  }

  // Team lead sees only assigned projects
  const userProjects = await prisma.userProject.findMany({
    where: { userId: session.user.id },
    include: {
      project: {
        include: { developer: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(userProjects.map((up) => up.project));
}
