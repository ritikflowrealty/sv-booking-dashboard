import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileLayout } from "@/components/MobileLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return <MobileLayout user={session.user}>{children}</MobileLayout>;
}
