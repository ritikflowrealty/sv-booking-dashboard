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
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "team_lead"],
    },
    {
      href: "/dashboard/entry",
      label: "Data Entry",
      icon: PlusCircle,
      roles: ["admin", "team_lead"],
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      icon: BarChart3,
      roles: ["admin", "team_lead"],
    },
    {
      href: "/dashboard/records",
      label: "Records",
      icon: FileText,
      roles: ["admin", "team_lead"],
    },
    {
      href: "/dashboard/sales-managers",
      label: "Sales Managers",
      icon: UserCheck,
      roles: ["admin", "team_lead"],
    },
    {
      href: "/dashboard/bulk-upload",
      label: "Bulk Upload",
      icon: Upload,
      roles: ["admin", "team_lead"],
    },
    {
      href: "/dashboard/projects",
      label: "Projects",
      icon: FolderKanban,
      roles: ["admin"],
    },
    {
      href: "/dashboard/developers",
      label: "Developers",
      icon: Building2,
      roles: ["admin"],
    },
    {
      href: "/dashboard/users",
      label: "Team Leads",
      icon: Users,
      roles: ["admin"],
    },
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(user.role));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Flow Realty" width={40} height={40} className="rounded-lg" />
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Flow Realty</h2>
            <p className="text-xs text-gray-500">SV Tracker</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                isActive
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-teal-700">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role.replace("_", " ")}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
