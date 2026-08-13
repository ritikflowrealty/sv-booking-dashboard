import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backup = await req.json();

  if (!backup?.data || !backup?.version) {
    return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
  }

  const { data } = backup;

  try {
    // Clear existing data in reverse dependency order
    await prisma.cancelDetail.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.salesManagerProject.deleteMany();
    await prisma.salesManager.deleteMany();
    await prisma.userProject.deleteMany();
    await prisma.project.deleteMany();
    await prisma.developer.deleteMany();
    // Don't delete the current admin user
    await prisma.user.deleteMany({ where: { id: { not: session.user.id } } });

    // Restore developers
    for (const dev of data.developers || []) {
      await prisma.developer.create({ data: { id: dev.id, name: dev.name, location: dev.location } });
    }

    // Restore projects
    for (const proj of data.projects || []) {
      await prisma.project.create({ data: { id: proj.id, name: proj.name, developerId: proj.developerId, location: proj.location } });
    }

    // Restore users (except current admin)
    for (const user of data.users || []) {
      if (user.id === session.user.id) continue;
      const existing = await prisma.user.findUnique({ where: { id: user.id } });
      if (!existing) {
        await prisma.user.create({
          data: { id: user.id, name: user.name, email: user.email, password: await hash("Temp@123", 12), role: user.role },
        });
      }
    }

    // Restore userProjects
    for (const up of data.userProjects || []) {
      await prisma.userProject.create({ data: { id: up.id, userId: up.userId, projectId: up.projectId } });
    }

    // Restore salesManagers
    for (const sm of data.salesManagers || []) {
      await prisma.salesManager.create({ data: { id: sm.id, name: sm.name, teamLeadId: sm.teamLeadId } });
    }

    // Restore salesManagerProjects
    for (const smp of data.salesManagerProjects || []) {
      await prisma.salesManagerProject.create({ data: { id: smp.id, salesManagerId: smp.salesManagerId, projectId: smp.projectId } });
    }

    // Restore entries
    for (const entry of data.entries || []) {
      await prisma.entry.create({
        data: {
          id: entry.id, salesManagerId: entry.salesManagerId, projectId: entry.projectId,
          periodStart: new Date(entry.periodStart), periodEnd: new Date(entry.periodEnd),
          year: entry.year, month: entry.month, half: entry.half,
          siteVisits: entry.siteVisits, bookings: entry.bookings, cancellations: entry.cancellations,
        },
      });
    }

    // Restore cancelDetails
    for (const cd of data.cancelDetails || []) {
      await prisma.cancelDetail.create({
        data: { id: cd.id, entryId: cd.entryId, count: cd.count, bookedYear: cd.bookedYear, bookedMonth: cd.bookedMonth, bookedHalf: cd.bookedHalf },
      });
    }

    return NextResponse.json({ message: "Backup restored successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 });
  }
}
