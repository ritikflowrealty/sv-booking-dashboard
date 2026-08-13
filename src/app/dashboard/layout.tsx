import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex bg-[#fafbfc]">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-auto">
        <div className="p-7 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
