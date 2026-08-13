"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { getPeriodLabel, getMonthName } from "@/lib/utils";
import { Users, Calendar, Target, XCircle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

type ZoomLevel = "15d" | "month" | "quarter" | "year";

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
interface SMOption { id: string; name: string; salesManagerProjects?: { project: { id: string } }[]; }

const ZOOM_LABELS: Record<ZoomLevel, string> = { "15d": "15 Days", month: "Monthly", quarter: "Quarterly", year: "Yearly" };
const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSM, setSelectedSM] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [allSalesManagers, setAllSalesManagers] = useState<SMOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<ZoomLevel>("quarter");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("/api/my-projects").then((r) => r.json()).then(setProjects);
    fetch("/api/sales-managers").then((r) => r.json()).then(setAllSalesManagers);
  }, [session]);

  // Filter sales managers by selected project
  const filteredSalesManagers = useMemo(() => {
    if (!selectedProject) return allSalesManagers;
    return allSalesManagers.filter((sm) =>
      sm.salesManagerProjects?.some((sp) => sp.project.id === selectedProject)
    );
  }, [selectedProject, allSalesManagers]);

  // Reset SM when project changes
  useEffect(() => {
    setSelectedSM("");
  }, [selectedProject]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ year: year.toString() });
    if (selectedProject) params.set("projectId", selectedProject);
    if (selectedSM) params.set("salesManagerId", selectedSM);
    fetch(`/api/dashboard?${params}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false); setPage(0); });
  }, [year, selectedProject, selectedSM]);

  // Aggregate chart data based on zoom level
  const chartData = useMemo(() => {
    if (!data) return [];
    const entries = data.entries;

    if (zoom === "15d") {
      return entries.map((e) => ({
        label: getPeriodLabel(e.year, e.month, e.half),
        sv: e.siteVisits, bookings: e.bookings, net: e.netBookings, cancel: e.cancellations,
        conv: e.siteVisits > 0 ? parseFloat(((e.bookings / e.siteVisits) * 100).toFixed(1)) : 0,
      }));
    }

    if (zoom === "month") {
      const map = new Map<string, { sv: number; bookings: number; net: number; cancel: number }>();
      entries.forEach((e) => {
        const key = `${getMonthName(e.month).slice(0, 3)} ${e.year}`;
        const cur = map.get(key) || { sv: 0, bookings: 0, net: 0, cancel: 0 };
        cur.sv += e.siteVisits; cur.bookings += e.bookings; cur.net += e.netBookings; cur.cancel += e.cancellations;
        map.set(key, cur);
      });
      return Array.from(map.entries()).map(([label, v]) => ({
        label, ...v, conv: v.sv > 0 ? parseFloat(((v.bookings / v.sv) * 100).toFixed(1)) : 0,
      }));
    }

    if (zoom === "quarter") {
      const map = new Map<string, { sv: number; bookings: number; net: number; cancel: number }>();
      entries.forEach((e) => {
        // FY quarters: Apr-Jun = Q1, Jul-Sep = Q2, Oct-Dec = Q3, Jan-Mar = Q4
        let fyQ: string;
        if (e.month >= 4 && e.month <= 6) fyQ = "Q1";
        else if (e.month >= 7 && e.month <= 9) fyQ = "Q2";
        else if (e.month >= 10 && e.month <= 12) fyQ = "Q3";
        else fyQ = "Q4";
        const fyYear = e.month >= 4 ? e.year : e.year - 1;
        const key = `${fyQ} FY${fyYear.toString().slice(2)}-${(fyYear + 1).toString().slice(2)}`;
        const cur = map.get(key) || { sv: 0, bookings: 0, net: 0, cancel: 0 };
        cur.sv += e.siteVisits; cur.bookings += e.bookings; cur.net += e.netBookings; cur.cancel += e.cancellations;
        map.set(key, cur);
      });
      return Array.from(map.entries()).map(([label, v]) => ({
        label, ...v, conv: v.sv > 0 ? parseFloat(((v.bookings / v.sv) * 100).toFixed(1)) : 0,
      }));
    }

    // year
    const totals = entries.reduce((acc, e) => {
      acc.sv += e.siteVisits; acc.bookings += e.bookings; acc.net += e.netBookings; acc.cancel += e.cancellations;
      return acc;
    }, { sv: 0, bookings: 0, net: 0, cancel: 0 });
    return [{ label: `FY ${year}`, ...totals, conv: totals.sv > 0 ? parseFloat(((totals.bookings / totals.sv) * 100).toFixed(1)) : 0 }];
  }, [data, zoom, year]);

  // Paginated table
  const tableEntries = useMemo(() => {
    if (!data) return [];
    // Sort chronologically descending
    return [...data.entries].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      return b.half - a.half;
    });
  }, [data]);

  const totalPages = Math.ceil(tableEntries.length / PAGE_SIZE);
  const pagedEntries = tableEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pieData = data ? [
    { name: "Net Bookings", value: Math.max(0, data.summary.totalNetBookings) },
    { name: "Cancellations", value: data.summary.totalCancellations },
  ] : [];
  const COLORS = ["#0d9488", "#b91c1c"];

  if (loading) return <LoadingScreen />;
  if (!data) return <LoadingScreen />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Performance overview for decision-making</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="select-sm">
            {[2026, 2027, 2028, 2029, 2030].map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="select-sm">
            <option value="">All Projects</option>
            {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <select value={selectedSM} onChange={(e) => setSelectedSM(e.target.value)} className="select-sm">
            <option value="">All Sales Managers</option>
            {filteredSalesManagers.map((sm) => (<option key={sm.id} value={sm.id}>{sm.name}</option>))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard title="Site Visits" value={data.summary.totalSV} icon={<Users className="w-4 h-4" />} color="teal" />
        <KPICard title="Bookings" value={data.summary.totalBookings} icon={<Calendar className="w-4 h-4" />} color="emerald" />
        <KPICard title="Net Bookings" value={data.summary.totalNetBookings} icon={<Target className="w-4 h-4" />} color="cyan" />
        <KPICard title="Cancellations" value={data.summary.totalCancellations} icon={<XCircle className="w-4 h-4" />} color="red" />
        <KPICard title="Conversion" value={`${data.summary.conversionRate}%`} icon={<TrendingUp className="w-4 h-4" />} color="amber" />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 bg-white border border-[#e8eced] rounded-[10px] p-1 w-fit shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {(["15d", "month", "quarter", "year"] as ZoomLevel[]).map((z) => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all duration-100 ${
              zoom === z ? "bg-[#115e59] text-white shadow-sm" : "text-[#64748b] hover:text-[#1a1a2e] hover:bg-[#f8fafb]"
            }`}
          >
            {ZOOM_LABELS[z]}
          </button>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Site Visits vs Bookings">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }} />
              <Bar dataKey="sv" name="Site Visits" fill="#0d9488" radius={[3, 3, 0, 0]} />
              <Bar dataKey="bookings" name="Bookings" fill="#059669" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Net Bookings and Cancellations">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }} />
              <Area type="monotone" dataKey="net" name="Net Bookings" stroke="#115e59" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="cancel" name="Cancellations" stroke="#b91c1c" fill="#fef2f2" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Conversion Rate (%)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
              <Bar dataKey="conv" name="Conversion %" fill="#b45309" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bookings vs Cancellations">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }}></div>
                <span className="text-[11px] text-[#64748b]">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Paginated Table */}
      <div className="bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#f1f3f4] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[#1a1a2e]" style={{ fontFamily: "var(--font-display)" }}>Period-wise Breakdown</h3>
          <span className="text-[11px] text-[#94a3b8]">{tableEntries.length} entries</span>
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
              {pagedEntries.map((e) => (
                <tr key={e.id} className="hover:bg-[#f8fafb] transition-colors duration-75">
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
              {pagedEntries.length === 0 && (<tr><td colSpan={8} className="px-5 py-10 text-center text-[#94a3b8]">No data available</td></tr>)}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[#f1f3f4] flex items-center justify-between">
            <span className="text-[12px] text-[#94a3b8]">Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-[6px] text-[#64748b] hover:bg-[#f1f3f4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1} className="p-1.5 rounded-[6px] text-[#64748b] hover:bg-[#f1f3f4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="relative">
        <Image src="/logo.png" alt="Loading" width={48} height={48} className="rounded-[12px] animate-pulse" />
      </div>
      <p className="text-[13px] text-[#94a3b8]">Loading dashboard...</p>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 ${className || ""}`}>
      <h3 className="text-[13px] font-semibold text-[#1a1a2e] mb-3" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">{title}</span>
        <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center ${s.bg} ${s.text}`}>{icon}</div>
      </div>
      <p className="text-[22px] font-semibold text-[#1a1a2e] tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
    </div>
  );
}
