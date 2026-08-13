"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getPeriodLabel } from "@/lib/utils";
import { Users, Calendar, Target, XCircle, TrendingUp } from "lucide-react";

interface EntryData {
  id: string;
  year: number;
  month: number;
  half: number;
  siteVisits: number;
  bookings: number;
  cancellations: number;
  netBookings: number;
  cancellationsDeducted: number;
  user: { id: string; name: string };
  project?: { id: string; name: string; developer: { id: string; name: string } } | null;
}

interface DashboardData {
  entries: EntryData[];
  summary: {
    totalSV: number;
    totalBookings: number;
    totalCancellations: number;
    totalNetBookings: number;
    conversionRate: string;
  };
}

interface ProjectOption {
  id: string;
  name: string;
  developer: { id: string; name: string };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user.role === "admin") {
      fetch("/api/users").then((res) => res.json()).then((data) => setUsers(data));
      fetch("/api/projects").then((res) => res.json()).then((data) => setProjects(data));
    }
  }, [session]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ year: year.toString() });
    if (selectedUser) params.set("userId", selectedUser);
    if (selectedProject) params.set("projectId", selectedProject);

    fetch(`/api/dashboard?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, [year, selectedUser, selectedProject]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const chartData = data.entries.map((entry) => ({
    period: getPeriodLabel(entry.year, entry.month, entry.half),
    "Site Visits": entry.siteVisits,
    Bookings: entry.bookings,
    "Net Bookings": entry.netBookings,
    Cancellations: entry.cancellations,
  }));

  const conversionData = data.entries.map((entry) => ({
    period: getPeriodLabel(entry.year, entry.month, entry.half),
    "Conversion %": entry.siteVisits > 0
      ? parseFloat(((entry.bookings / entry.siteVisits) * 100).toFixed(1))
      : 0,
  }));

  const pieData = [
    { name: "Net Bookings", value: Math.max(0, data.summary.totalNetBookings) },
    { name: "Cancellations", value: data.summary.totalCancellations },
  ];

  const COLORS = ["#0f766e", "#dc2626"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of site visits, bookings and performance</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {session?.user.role === "admin" && (
            <>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.developer.name} / {p.name}</option>
                ))}
              </select>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Team Leads</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Site Visits" value={data.summary.totalSV} icon={<Users className="w-5 h-5" />} color="teal" />
        <KPICard title="Total Bookings" value={data.summary.totalBookings} icon={<Calendar className="w-5 h-5" />} color="emerald" />
        <KPICard title="Net Bookings" value={data.summary.totalNetBookings} icon={<Target className="w-5 h-5" />} color="cyan" />
        <KPICard title="Cancellations" value={data.summary.totalCancellations} icon={<XCircle className="w-5 h-5" />} color="red" />
        <KPICard title="Conversion Rate" value={`${data.summary.conversionRate}%`} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Site Visits vs Bookings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Site Visits" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bookings" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Net Bookings Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="Net Bookings" stroke="#0f766e" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="Cancellations" stroke="#dc2626" fill="#fef2f2" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversion Rate Trend (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="Conversion %" stroke="#d97706" strokeWidth={2} dot={{ fill: "#d97706" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Bookings vs Cancellations</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Period-wise Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Period</th>
                {session?.user.role === "admin" && (
                  <>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Project</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Team Lead</th>
                  </>
                )}
                <th className="text-right px-5 py-3 font-medium text-gray-600">Site Visits</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Bookings</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Net Bookings</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Cancellations</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Conversion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{getPeriodLabel(entry.year, entry.month, entry.half)}</td>
                  {session?.user.role === "admin" && (
                    <>
                      <td className="px-5 py-3 text-gray-600">{entry.project ? `${entry.project.developer.name} / ${entry.project.name}` : "-"}</td>
                      <td className="px-5 py-3 text-gray-600">{entry.user.name}</td>
                    </>
                  )}
                  <td className="text-right px-5 py-3 text-gray-900 font-medium">{entry.siteVisits}</td>
                  <td className="text-right px-5 py-3 text-emerald-600 font-medium">{entry.bookings}</td>
                  <td className="text-right px-5 py-3 font-medium">
                    <span className={entry.netBookings >= 0 ? "text-teal-600" : "text-red-600"}>{entry.netBookings}</span>
                  </td>
                  <td className="text-right px-5 py-3 text-red-600 font-medium">{entry.cancellations}</td>
                  <td className="text-right px-5 py-3 text-amber-600 font-medium">
                    {entry.siteVisits > 0 ? ((entry.bookings / entry.siteVisits) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              ))}
              {data.entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">No data available for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    teal: "bg-teal-50 text-teal-600",
    emerald: "bg-emerald-50 text-emerald-600",
    cyan: "bg-cyan-50 text-cyan-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
