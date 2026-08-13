import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { siteVisits, bookings, cancellations, cancelDetails } = await req.json();

  const entry = await prisma.entry.update({
    where: { id },
    data: { siteVisits, bookings, cancellations },
  });

  // Update cancel details
  if (cancelDetails) {
    await prisma.cancelDetail.deleteMany({ where: { entryId: id } });
    if (cancellations > 0 && cancelDetails.length > 0) {
      await prisma.cancelDetail.createMany({
        data: cancelDetails.map(
          (detail: { count: number; bookedYear: number; bookedMonth: number; bookedHalf: number }) => ({
            entryId: id,
            count: detail.count,
            bookedYear: detail.bookedYear,
            bookedMonth: detail.bookedMonth,
            bookedHalf: detail.bookedHalf,
          })
        ),
      });
    }
  }

  return NextResponse.json(entry);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.entry.delete({ where: { id } });

  return NextResponse.json({ message: "Entry deleted" });
}
