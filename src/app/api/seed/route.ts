import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@ritikflow.com" },
    });

    if (existingAdmin) {
      return NextResponse.json({ message: "Admin already exists" });
    }

    const hashedPassword = await hash("admin123", 12);

    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@ritikflow.com",
        password: hashedPassword,
        role: "admin",
      },
    });

    return NextResponse.json({ message: "Admin user created successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
