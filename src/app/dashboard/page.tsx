"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { getPeriodLabel } from "@/lib/utils";
import { Users, Calendar, Target, XCircle, TrendingUp } from "lucide-react";

interface EntryData {
  id: string; year: number; month: number; half: number;
  siteVisits: number; bookings: number; cancellations: number; netBookings: number;
  salesManager: { id: string; name: string };
  project: { id: string; name: string; developer: { id: string; name: string } };
}

interface DashboardData {
  entries: EntryData[];
  summary: { totalSV: number; totalBookings: number; totalCancellations: number; totalNetBookings: number; conversionRate: string };
}

interface ProjectOption { id: string; name: string; developer: { name: string }; }
interface SMOption { id: string; name: string; }

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSM, setSelectedSM] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [salesManagers, setSalesManagers] = useState<SMOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my-projects").then((r) => r.json()).then(setProjects);
    fetch("/api/sales-managers").then((r) => r.json()).then(setSalesManagers);
  }, [session]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ year: year.toString() });
    if (selectedProject) params.set("projectId", selectedProject);
    if (selectedSM) params.set("salesManagerId", selectedSM);
    fetch(`/api/dashboard?${params}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, [year, selectedProject, selectedSM]);

  if (loading || !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const chartData = data.entries.map((e) => ({
    period: getPeriodLabel(e.year, e.month, e.half),
    "Site Visits": e.siteVisits, Bookings: e.bookings, "Net Bookings": e.netBookings, Cancellations: e.cancellations,
  }));

  const conversionData = data.entries.map((e) => ({
    period: getPeriodLabel(e.year, e.month, e.half),
    "Conversion %": e.siteVisits > 0 ? parseFloat(((e.bookings / e.siteVisits) * 100).toFixed(1)) : 0,
  }));

  const pieData = [
    { name: "Net Bookings", value: Math.max(0, data.summary.totalNetBookings) },
    { name: "Cancellations", value: data.summary.totalCancellations },
  ];
  const COLORS = ["#0d9488", "#b91c1c"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Site visits, bookings and performance overview</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-1.5 border border-[#e8eced] rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20">
            {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="px-3 py-1.5 border border-[#e8eced] rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20">
            <option value="">All Projects</option>
            {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <select value={selectedSM} onChange={(e) => setSelectedSM(e.target.value)} className="px-3 py-1.5 border border-[#e8eced] rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20">
            <option value="">All Sales Managers</option>
            {salesManagers.map((sm) => (<option key={sm.id} value={sm.id}>{sm.name}</option>))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Site Visits" value={data.summary.totalSV} icon={<Users className="w-4 h-4" />} color="teal" />
        <KPICard title="Bookings" value={data.summary.totalBookings} icon={<Calendar className="w-4 h-4" />} color="emerald" />
        <KPICard title="Net Bookings" value={data.summary.totalNetBookings} icon={<Target className="w-4 h-4" />} color="cyan" />
        <KPICard title="Cancellations" value={data.summary.totalCancellations} icon={<XCircle className="w-4 h-4" />} color="red" />
        <KPICard title="Conversion" value={`${data.summary.conversionRate}%`} icon={<TrendingUp className="w-4 h-4" />} color="amber" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Site Visits vs Bookings">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={60} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Site Visits" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bookings" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Net Bookings Trend">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={60} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Net Bookings" stroke="#115e59" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="Cancellations" stroke="#b91c1c" fill="#fef2f2" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Conversion Rate (%)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={60} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }} />
              <Line type="monotone" dataKey="Conversion %" stroke="#b45309" strokeWidth={2} dot={{ fill: "#b45309", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bookings vs Cancellations">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f1f3f4]">
          <h3 className="text-[14px] font-semibold text-[#1a1a2e]" style={{ fontFamily: "var(--font-display)" }}>Period-wise Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#fafbfc]">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-[#64748b]">Period</th>
                <th className="text-left px-5 py-2.5 font-medium text-[#64748b]">Sales Manager</th>
                <th className="text-left px-5 py-2.5 font-medium text-[#64748b]">Project</th>
                <th className="text-right px-5 py-2.5 font-medium text-[#64748b]">SV</th>
                <th className="text-right px-5 py-2.5 font-medium text-[#64748b]">Bookings</th>
                <th className="text-right px-5 py-2.5 font-medium text-[#64748b]">Net</th>
                <th className="text-right px-5 py-2.5 font-medium text-[#64748b]">Cancel</th>
                <th className="text-right px-5 py-2.5 font-medium text-[#64748b]">Conv %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f4]">
              {data.entries.map((e) => (
                <tr key={e.id} className="hover:bg-[#f8fafb] transition-colors duration-100">
                  <td className="px-5 py-2.5 text-[#1a1a2e]">{getPeriodLabel(e.year, e.month, e.half)}</td>
                  <td className="px-5 py-2.5 text-[#64748b]">{e.salesManager.name}</td>
                  <td className="px-5 py-2.5 text-[#64748b]">{e.project.name}</td>
                  <td className="text-right px-5 py-2.5 font-medium text-[#1a1a2e] tabular-nums">{e.siteVisits}</td>
                  <td className="text-right px-5 py-2.5 font-medium text-[#047857] tabular-nums">{e.bookings}</td>
                  <td className="text-right px-5 py-2.5 font-medium tabular-nums"><span className={e.netBookings >= 0 ? "text-[#115e59]" : "text-[#b91c1c]"}>{e.netBookings}</span></td>
                  <td className="text-right px-5 py-2.5 font-medium text-[#b91c1c] tabular-nums">{e.cancellations}</td>
                  <td className="text-right px-5 py-2.5 font-medium text-[#b45309] tabular-nums">{e.siteVisits > 0 ? ((e.bookings / e.siteVisits) * 100).toFixed(1) : "0"}%</td>
                </tr>
              ))}
              {data.entries.length === 0 && (<tr><td colSpan={8} className="px-5 py-10 text-center text-[#94a3b8]">No data available for this period</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 ${className || ""}`}>
      <h3 className="text-[13px] font-semibold text-[#1a1a2e] mb-4" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
      {children}
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    teal: { bg: "bg-[#f0fdfa]", text: "text-[#115e59]" },
    emerald: { bg: "bg-[#ecfdf5]", text: "text-[#047857]" },
    cyan: { bg: "bg-[#ecfeff]", text: "text-[#0e7490]" },
    red: { bg: "bg-[#fef2f2]", text: "text-[#b91c1c]" },
    amber: { bg: "bg-[#fffbeb]", text: "text-[#b45309]" },
  };
  const s = styles[color];

  return (
    <div className="bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">{title}</span>
        <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center ${s.bg} ${s.text}`}>{icon}</div>
      </div>
      <p className="text-[22px] font-semibold text-[#1a1a2e] tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
    </div>
  );
}
