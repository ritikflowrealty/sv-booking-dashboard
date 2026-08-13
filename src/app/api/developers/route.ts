import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const developers = await prisma.developer.findMany({
    include: {
      projects: {
        include: {
          _count: { select: { entries: true, userProjects: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(developers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, location } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.developer.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Developer already exists" }, { status: 400 });
  }

  const developer = await prisma.developer.create({
    data: { name, location },
  });

  return NextResponse.json(developer);
}
