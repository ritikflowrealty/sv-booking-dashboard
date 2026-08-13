"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  ComposedChart, Line,
} from "recharts";
import { getPeriodLabel, getMonthName } from "@/lib/utils";
import { Users, Calendar, Target, XCircle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
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
const PAGE_SIZE = 12;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
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

  const filteredSalesManagers = useMemo(() => {
    if (!selectedProject) return allSalesManagers;
    return allSalesManagers.filter((sm) =>
      sm.salesManagerProjects?.some((sp) => sp.project.id === selectedProject)
    );
  }, [selectedProject, allSalesManagers]);

  useEffect(() => { setSelectedSM(""); }, [selectedProject]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("years", selectedYears.join(","));
    if (selectedMonths.length > 0) params.set("months", selectedMonths.join(","));
    if (selectedProject) params.set("projectId", selectedProject);
    if (selectedSM) params.set("salesManagerId", selectedSM);
    fetch(`/api/dashboard?${params}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false); setPage(0); });
  }, [selectedYears, selectedMonths, selectedProject, selectedSM]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleYear = (y: number) => {
    setSelectedYears((prev) => prev.includes(y) ? (prev.length > 1 ? prev.filter((v) => v !== y) : prev) : [...prev, y].sort());
  };

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) => prev.includes(m) ? prev.filter((v) => v !== m) : [...prev, m].sort((a, b) => a - b));
  };

  // Aggregate data based on zoom
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

    const map = new Map<string, { sv: number; bookings: number; net: number; cancel: number }>();

    if (zoom === "month") {
      entries.forEach((e) => {
        const key = `${MONTHS[e.month - 1]} ${e.year}`;
        const cur = map.get(key) || { sv: 0, bookings: 0, net: 0, cancel: 0 };
        cur.sv += e.siteVisits; cur.bookings += e.bookings; cur.net += e.netBookings; cur.cancel += e.cancellations;
        map.set(key, cur);
      });
    } else if (zoom === "quarter") {
      entries.forEach((e) => {
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
    } else {
      entries.forEach((e) => {
        const key = `${e.year}`;
        const cur = map.get(key) || { sv: 0, bookings: 0, net: 0, cancel: 0 };
        cur.sv += e.siteVisits; cur.bookings += e.bookings; cur.net += e.netBookings; cur.cancel += e.cancellations;
        map.set(key, cur);
      });
    }

    return Array.from(map.entries()).map(([label, v]) => ({
      label, ...v, conv: v.sv > 0 ? parseFloat(((v.bookings / v.sv) * 100).toFixed(1)) : 0,
    }));
  }, [data, zoom]);

  // Top performers
  const topPerformers = useMemo(() => {
    if (!data) return [];
    const smMap = new Map<string, { name: string; sv: number; bookings: number }>();
    data.entries.forEach((e) => {
      const cur = smMap.get(e.salesManager.id) || { name: e.salesManager.name, sv: 0, bookings: 0 };
      cur.sv += e.siteVisits; cur.bookings += e.bookings;
      smMap.set(e.salesManager.id, cur);
    });
    return Array.from(smMap.values())
      .map((v) => ({ ...v, conv: v.sv > 0 ? parseFloat(((v.bookings / v.sv) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  }, [data]);

  // Paginated table
  const tableEntries = useMemo(() => {
    if (!data) return [];
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
      {/* Header + Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
            <p className="text-[13px] text-[#64748b] mt-0.5">Performance overview for decision-making</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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

        {/* Year + Month multi-select chips */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider mr-1">Year</span>
            {[2026, 2027, 2028, 2029, 2030].map((y) => (
              <button key={y} onClick={() => toggleYear(y)} className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-all duration-100 ${selectedYears.includes(y) ? "bg-[#115e59] text-white" : "bg-[#f1f3f4] text-[#64748b] hover:bg-[#e8eced]"}`}>
                {y}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-[#e8eced]"></div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider mr-1">Month</span>
            {MONTHS.map((m, i) => (
              <button key={i} onClick={() => toggleMonth(i + 1)} className={`px-2 py-1 rounded-[6px] text-[11px] font-medium transition-all duration-100 ${selectedMonths.includes(i + 1) ? "bg-[#0d9488] text-white" : "bg-[#f1f3f4] text-[#64748b] hover:bg-[#e8eced]"}`}>
                {m}
              </button>
            ))}
            {selectedMonths.length > 0 && (
              <button onClick={() => setSelectedMonths([])} className="px-2 py-1 rounded-[6px] text-[11px] font-medium text-[#b91c1c] bg-[#fef2f2] hover:bg-[#fecaca] transition-all">Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard title="Site Visits" value={data.summary.totalSV} icon={<Users className="w-4 h-4" />} color="teal" />
        <KPICard title="Bookings" value={data.summary.totalBookings} icon={<Calendar className="w-4 h-4" />} color="emerald" />
        <KPICard title="Net Bookings" value={data.summary.totalNetBookings} icon={data.summary.totalNetBookings >= 0 ? <Target className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} color={data.summary.totalNetBookings >= 0 ? "cyan" : "red"} />
        <KPICard title="Cancellations" value={data.summary.totalCancellations} icon={<XCircle className="w-4 h-4" />} color="red" />
        <KPICard title="Conversion" value={`${data.summary.conversionRate}%`} icon={<TrendingUp className="w-4 h-4" />} color="amber" />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 bg-white border border-[#e8eced] rounded-[10px] p-1 w-fit shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {(["15d", "month", "quarter", "year"] as ZoomLevel[]).map((z) => (
          <button key={z} onClick={() => setZoom(z)} className={`px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all duration-100 ${zoom === z ? "bg-[#115e59] text-white shadow-sm" : "text-[#64748b] hover:text-[#1a1a2e] hover:bg-[#f8fafb]"}`}>
            {ZOOM_LABELS[z]}
          </button>
        ))}
      </div>

      {/* Charts Row 1: Main metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Site Visits vs Bookings" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="sv" name="Site Visits" fill="#0d9488" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#059669" radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="conv" name="Conversion %" stroke="#b45309" strokeWidth={2} dot={{ r: 3, fill: "#b45309" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Donut + legend */}
        <ChartCard title="Bookings Breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }}></div>
                <span className="text-[11px] text-[#64748b]">{d.name}: <b className="text-[#1a1a2e]">{d.value}</b></span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2: Net bookings + Top performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Net Bookings Trend" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
              <Area type="monotone" dataKey="net" name="Net Bookings" stroke="#115e59" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="cancel" name="Cancellations" stroke="#b91c1c" fill="#fef2f2" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Performers */}
        <ChartCard title="Top Performers (by Bookings)">
          <div className="space-y-2.5">
            {topPerformers.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-[#94a3b8] w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#1a1a2e] truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 bg-[#f1f3f4] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0d9488] rounded-full" style={{ width: `${topPerformers[0]?.bookings ? (p.bookings / topPerformers[0].bookings) * 100 : 0}%` }}></div>
                    </div>
                    <span className="text-[10px] text-[#64748b] tabular-nums">{p.bookings} bkgs</span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-[#b45309] tabular-nums">{p.conv}%</span>
              </div>
            ))}
            {topPerformers.length === 0 && <p className="text-[12px] text-[#94a3b8] text-center py-4">No data</p>}
          </div>
        </ChartCard>
      </div>

      {/* Paginated Table */}
      <div className="bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#f1f3f4] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[#1a1a2e]" style={{ fontFamily: "var(--font-display)" }}>Detailed Records</h3>
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
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[#f1f3f4] flex items-center justify-between">
            <span className="text-[12px] text-[#94a3b8]">Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-[6px] text-[#64748b] hover:bg-[#f1f3f4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1} className="p-1.5 rounded-[6px] text-[#64748b] hover:bg-[#f1f3f4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
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
      <Image src="/logo.png" alt="Loading" width={48} height={48} className="rounded-[12px] animate-pulse" />
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
