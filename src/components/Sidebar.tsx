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

  // Grouped by workflow: Daily ops first, then management, then admin
  const sections = [
    {
      label: "",
      links: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "team_lead"] },
      ],
    },
    {
      label: "Data",
      links: [
        { href: "/dashboard/entry", label: "Data Entry", icon: PlusCircle, roles: ["admin", "team_lead"] },
        { href: "/dashboard/bulk-upload", label: "Bulk Upload", icon: Upload, roles: ["admin", "team_lead"] },
        { href: "/dashboard/records", label: "Records", icon: FileText, roles: ["admin", "team_lead"] },
      ],
    },
    {
      label: "Insights",
      links: [
        { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "team_lead"] },
      ],
    },
    {
      label: "Team",
      links: [
        { href: "/dashboard/sales-managers", label: "Sales Managers", icon: UserCheck, roles: ["admin", "team_lead"] },
        { href: "/dashboard/deputy-tls", label: "Deputy TLs", icon: Users, roles: ["admin", "team_lead"] },
        { href: "/dashboard/users", label: "Team Leads", icon: Users, roles: ["admin"] },
      ],
    },
    {
      label: "Setup",
      links: [
        { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, roles: ["admin"] },
        { href: "/dashboard/developers", label: "Developers", icon: Building2, roles: ["admin"] },
        { href: "/dashboard/backup", label: "Backup", icon: DatabaseBackup, roles: ["admin"] },
      ],
    },
  ];

  return (
    <aside className="w-[240px] bg-white border-r border-[#e8eced] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#e8eced]">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Flow Realty" width={32} height={32} className="rounded-[8px]" />
          <div>
            <h2 className="font-semibold text-[13px] text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Flow Realty</h2>
            <p className="text-[10px] text-[#94a3b8] leading-tight">Booking & SV Tracker</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {sections.map((section, sIdx) => {
          const visibleLinks = section.links.filter((l) => l.roles.includes(user.role));
          if (visibleLinks.length === 0) return null;

          return (
            <div key={sIdx} className={sIdx > 0 ? "mt-4" : ""}>
              {section.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold text-[#b0b8c1] uppercase tracking-wider">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] text-[13px] font-medium transition-all duration-100",
                        isActive
                          ? "bg-[#f0fdfa] text-[#115e59]"
                          : "text-[#5a6474] hover:bg-[#f8fafb] hover:text-[#1a1a2e]"
                      )}
                    >
                      <Icon className="w-[16px] h-[16px]" strokeWidth={isActive ? 2.2 : 1.7} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-[#e8eced]">
        <div className="flex items-center gap-2.5 px-3 py-1.5 mb-1">
          <div className="w-6 h-6 bg-[#f0fdfa] rounded-full flex items-center justify-center">
            <span className="text-[10px] font-semibold text-[#115e59]">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#1a1a2e] truncate">{user.name}</p>
            <p className="text-[10px] text-[#94a3b8] capitalize">{user.role.replace("_", " ")}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] text-[12px] font-medium text-[#5a6474] hover:bg-[#fef2f2] hover:text-[#b91c1c] transition-all duration-100 w-full"
        >
          <LogOut className="w-[15px] h-[15px]" strokeWidth={1.7} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
