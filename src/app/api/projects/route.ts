import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    include: {
      developer: true,
      _count: { select: { users: true, entries: true } },
    },
    orderBy: [{ developer: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, developerId, location } = await req.json();

  if (!name || !developerId) {
    return NextResponse.json(
      { error: "Name and developer are required" },
      { status: 400 }
    );
  }

  try {
    const project = await prisma.project.create({
      data: { name, developerId, location },
      include: { developer: true },
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json(
      { error: "Project already exists for this developer" },
      { status: 400 }
    );
  }
}
