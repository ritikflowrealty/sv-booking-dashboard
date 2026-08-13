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
  id: string;
  year: number;
  month: number;
  half: number;
  siteVisits: number;
  bookings: number;
  cancellations: number;
  netBookings: number;
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

    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [year, selectedProject, selectedSM]);

  if (loading || !data) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

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
  const COLORS = ["#0f766e", "#dc2626"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of site visits, bookings and performance</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Projects</option>
            {projects.map((p) => (<option key={p.id} value={p.id}>{p.developer.name} / {p.name}</option>))}
          </select>
          <select value={selectedSM} onChange={(e) => setSelectedSM(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Sales Managers</option>
            {salesManagers.map((sm) => (<option key={sm.id} value={sm.id}>{sm.name}</option>))}
          </select>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Site Visits vs Bookings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
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
              <YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
              <Area type="monotone" dataKey="Net Bookings" stroke="#0f766e" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="Cancellations" stroke="#dc2626" fill="#fef2f2" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversion Rate (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} unit="%" /><Tooltip />
              <Line type="monotone" dataKey="Conversion %" stroke="#d97706" strokeWidth={2} dot={{ fill: "#d97706" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Bookings vs Cancellations</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-900">Period-wise Breakdown</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Period</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Sales Manager</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Project</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">SV</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Bookings</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Net</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Cancellations</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Conv %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{getPeriodLabel(e.year, e.month, e.half)}</td>
                  <td className="px-5 py-3 text-gray-600">{e.salesManager.name}</td>
                  <td className="px-5 py-3 text-gray-600">{e.project.developer.name} / {e.project.name}</td>
                  <td className="text-right px-5 py-3 font-medium">{e.siteVisits}</td>
                  <td className="text-right px-5 py-3 text-emerald-600 font-medium">{e.bookings}</td>
                  <td className="text-right px-5 py-3 font-medium"><span className={e.netBookings >= 0 ? "text-teal-600" : "text-red-600"}>{e.netBookings}</span></td>
                  <td className="text-right px-5 py-3 text-red-600 font-medium">{e.cancellations}</td>
                  <td className="text-right px-5 py-3 text-amber-600 font-medium">{e.siteVisits > 0 ? ((e.bookings / e.siteVisits) * 100).toFixed(1) : "0"}%</td>
                </tr>
              ))}
              {data.entries.length === 0 && (<tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">No data available</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = { teal: "bg-teal-50 text-teal-600", emerald: "bg-emerald-50 text-emerald-600", cyan: "bg-cyan-50 text-cyan-600", red: "bg-red-50 text-red-600", amber: "bg-amber-50 text-amber-600" };
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
