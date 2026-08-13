"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ComposedChart, Line, LineChart,
} from "recharts";
import { getPeriodLabel, getMonthName } from "@/lib/utils";
import Image from "next/image";

type ZoomLevel = "15d" | "month" | "quarter";

interface EntryData {
  id: string; year: number; month: number; half: number;
  siteVisits: number; bookings: number; cancellations: number; netBookings: number;
  salesManager: { id: string; name: string };
  project: { id: string; name: string; developer: { id: string; name: string } };
}

interface ProjectOption { id: string; name: string; developer: { name: string }; }
interface SMOption { id: string; name: string; salesManagerProjects?: { project: { id: string } }[]; }

const ZOOM_LABELS: Record<ZoomLevel, string> = { "15d": "15 Days", month: "Monthly", quarter: "Quarterly" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSM, setSelectedSM] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [allSalesManagers, setAllSalesManagers] = useState<SMOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<ZoomLevel>("month");

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

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ years: selectedYears.join(",") });
    if (selectedProject) params.set("projectId", selectedProject);
    if (selectedSM) params.set("salesManagerId", selectedSM);
    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then((data) => { setEntries(data.entries || []); setLoading(false); });
  }, [selectedYears, selectedProject, selectedSM]);

  const toggleYear = (y: number) => {
    setSelectedYears((prev) => prev.includes(y) ? (prev.length > 1 ? prev.filter((v) => v !== y) : prev) : [...prev, y].sort());
  };

  // Aggregate data based on zoom
  const chartData = useMemo(() => {
    const map = new Map<string, { sv: number; bookings: number; net: number; cancel: number }>();

    if (zoom === "15d") {
      entries.forEach((e) => {
        const key = getPeriodLabel(e.year, e.month, e.half);
        const cur = map.get(key) || { sv: 0, bookings: 0, net: 0, cancel: 0 };
        cur.sv += e.siteVisits; cur.bookings += e.bookings; cur.net += e.netBookings; cur.cancel += e.cancellations;
        map.set(key, cur);
      });
    } else if (zoom === "month") {
      entries.forEach((e) => {
        const key = `${MONTHS[e.month - 1]} ${e.year}`;
        const cur = map.get(key) || { sv: 0, bookings: 0, net: 0, cancel: 0 };
        cur.sv += e.siteVisits; cur.bookings += e.bookings; cur.net += e.netBookings; cur.cancel += e.cancellations;
        map.set(key, cur);
      });
    } else {
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
    }

    return Array.from(map.entries()).map(([label, v]) => ({
      label, ...v, conv: v.sv > 0 ? parseFloat(((v.bookings / v.sv) * 100).toFixed(1)) : 0,
    }));
  }, [entries, zoom]);

  // Cumulative data (always monthly for readability)
  const cumulativeData = useMemo(() => {
    const monthMap = new Map<string, { sv: number; bookings: number; cancel: number }>();
    entries.forEach((e) => {
      const key = `${MONTHS[e.month - 1]} ${e.year}`;
      const cur = monthMap.get(key) || { sv: 0, bookings: 0, cancel: 0 };
      cur.sv += e.siteVisits; cur.bookings += e.bookings; cur.cancel += e.cancellations;
      monthMap.set(key, cur);
    });

    let cumSV = 0, cumBookings = 0, cumCancel = 0;
    return Array.from(monthMap.entries()).map(([label, v]) => {
      cumSV += v.sv; cumBookings += v.bookings; cumCancel += v.cancel;
      return { label, "Cumulative SV": cumSV, "Cumulative Bookings": cumBookings, "Cumulative Cancellations": cumCancel };
    });
  }, [entries]);

  // SM-level performance comparison
  const smPerformance = useMemo(() => {
    const smMap = new Map<string, { name: string; sv: number; bookings: number; cancel: number }>();
    entries.forEach((e) => {
      const cur = smMap.get(e.salesManager.id) || { name: e.salesManager.name, sv: 0, bookings: 0, cancel: 0 };
      cur.sv += e.siteVisits; cur.bookings += e.bookings; cur.cancel += e.cancellations;
      smMap.set(e.salesManager.id, cur);
    });
    return Array.from(smMap.values())
      .map((v) => ({ ...v, conv: v.sv > 0 ? parseFloat(((v.bookings / v.sv) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.bookings - a.bookings);
  }, [entries]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Image src="/logo.png" alt="Loading" width={48} height={48} className="rounded-[12px] animate-pulse" />
      <p className="text-[13px] text-[#94a3b8]">Loading analytics...</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Analytics</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Trends, comparisons, and performance breakdown</p>
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

      {/* Year chips */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider mr-1">Year</span>
        {[2026, 2027, 2028, 2029, 2030].map((y) => (
          <button key={y} onClick={() => toggleYear(y)} className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-all duration-100 ${selectedYears.includes(y) ? "bg-[#115e59] text-white" : "bg-[#f1f3f4] text-[#64748b] hover:bg-[#e8eced]"}`}>
            {y}
          </button>
        ))}
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 bg-white border border-[#e8eced] rounded-[10px] p-1 w-fit shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {(["15d", "month", "quarter"] as ZoomLevel[]).map((z) => (
          <button key={z} onClick={() => setZoom(z)} className={`px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all duration-100 ${zoom === z ? "bg-[#115e59] text-white shadow-sm" : "text-[#64748b] hover:text-[#1a1a2e] hover:bg-[#f8fafb]"}`}>
            {ZOOM_LABELS[z]}
          </button>
        ))}
      </div>

      {/* Chart 1: Combined overview with conversion line */}
      <ChartCard title="Performance Overview">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" axisLine={false} tickLine={false} domain={[0, 50]} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="sv" name="Site Visits" fill="#0d9488" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#059669" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="cancel" name="Cancellations" fill="#b91c1c" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="conv" name="Conversion %" stroke="#b45309" strokeWidth={2} dot={{ r: 3, fill: "#b45309" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 2+3: Net Bookings + Conversion side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Net Bookings Trend">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
              <Area type="monotone" dataKey="net" name="Net Bookings" stroke="#115e59" fill="#ccfbf1" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Conversion Rate Trend">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
              <Area type="monotone" dataKey="conv" name="Conversion %" stroke="#b45309" fill="#fffbeb" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Chart 4: Cumulative growth (always monthly) */}
      <ChartCard title="Cumulative Growth (Monthly)">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
            <Line type="monotone" dataKey="Cumulative SV" stroke="#0d9488" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Cumulative Bookings" stroke="#059669" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Cumulative Cancellations" stroke="#b91c1c" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 5: SM Performance comparison (horizontal bar) */}
      {smPerformance.length > 1 && (
        <ChartCard title="Sales Manager Comparison">
          <ResponsiveContainer width="100%" height={Math.max(200, smPerformance.length * 40)}>
            <BarChart data={smPerformance} layout="vertical" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={100} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8eced", fontSize: 12 }} />
              <Bar dataKey="bookings" name="Bookings" fill="#059669" radius={[0, 3, 3, 0]} />
              <Bar dataKey="cancel" name="Cancellations" fill="#b91c1c" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
      <h3 className="text-[13px] font-semibold text-[#1a1a2e] mb-3" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
      {children}
    </div>
  );
}
