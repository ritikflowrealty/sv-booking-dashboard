"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  LogOut,
  BarChart3,
  Building2,
  FolderKanban,
  FileText,
  UserCheck,
  Upload,
  DatabaseBackup,
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "team_lead"] },
    { href: "/dashboard/entry", label: "Data Entry", icon: PlusCircle, roles: ["admin", "team_lead"] },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "team_lead"] },
    { href: "/dashboard/records", label: "Records", icon: FileText, roles: ["admin", "team_lead"] },
    { href: "/dashboard/sales-managers", label: "Sales Managers", icon: UserCheck, roles: ["admin", "team_lead"] },
    { href: "/dashboard/bulk-upload", label: "Bulk Upload", icon: Upload, roles: ["admin", "team_lead"] },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, roles: ["admin"] },
    { href: "/dashboard/developers", label: "Developers", icon: Building2, roles: ["admin"] },
    { href: "/dashboard/users", label: "Team Leads", icon: Users, roles: ["admin"] },
    { href: "/dashboard/backup", label: "Backup", icon: DatabaseBackup, roles: ["admin"] },
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(user.role));

  return (
    <aside className="w-[260px] bg-white border-r border-[#e8eced] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#e8eced]">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Flow Realty" width={36} height={36} className="rounded-[10px]" />
          <div>
            <h2 className="font-semibold text-[14px] text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Flow Realty</h2>
            <p className="text-[11px] text-[#94a3b8]">SV Tracker</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-[#f0fdfa] text-[#115e59]"
                  : "text-[#64748b] hover:bg-[#f8fafb] hover:text-[#1a1a2e]"
              )}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[#e8eced]">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-[#f0fdfa] rounded-full flex items-center justify-center">
            <span className="text-[11px] font-semibold text-[#115e59]">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#1a1a2e] truncate">{user.name}</p>
            <p className="text-[11px] text-[#94a3b8] capitalize">{user.role.replace("_", " ")}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium text-[#64748b] hover:bg-[#fef2f2] hover:text-[#b91c1c] transition-all duration-150 w-full"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
