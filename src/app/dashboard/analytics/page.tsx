"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, ComposedChart,
} from "recharts";
import { getPeriodLabel } from "@/lib/utils";

interface EntryData {
  id: string;
  year: number;
  month: number;
  half: number;
  siteVisits: number;
  bookings: number;
  cancellations: number;
  netBookings: number;
  user: { id: string; name: string };
  project?: { id: string; name: string; developer: { id: string; name: string } } | null;
}

interface ProjectOption {
  id: string;
  name: string;
  developer: { id: string; name: string };
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
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
      .then((data) => { setEntries(data.entries || []); setLoading(false); });
  }, [year, selectedUser, selectedProject]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  const periodData = entries.map((entry) => ({
    period: getPeriodLabel(entry.year, entry.month, entry.half),
    "Site Visits": entry.siteVisits,
    Bookings: entry.bookings,
    "Net Bookings": entry.netBookings,
    Cancellations: entry.cancellations,
    "Conversion %": entry.siteVisits > 0 ? parseFloat(((entry.bookings / entry.siteVisits) * 100).toFixed(1)) : 0,
  }));

  const monthlyMap = new Map<string, { sv: number; bookings: number; cancel: number; net: number }>();
  entries.forEach((entry) => {
    const key = `${entry.year}-${entry.month.toString().padStart(2, "0")}`;
    const existing = monthlyMap.get(key) || { sv: 0, bookings: 0, cancel: 0, net: 0 };
    existing.sv += entry.siteVisits;
    existing.bookings += entry.bookings;
    existing.cancel += entry.cancellations;
    existing.net += entry.netBookings;
    monthlyMap.set(key, existing);
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => ({
    month: monthNames[parseInt(key.split("-")[1]) - 1],
    "Site Visits": val.sv, Bookings: val.bookings, "Net Bookings": val.net, Cancellations: val.cancel,
    "Conversion %": val.sv > 0 ? parseFloat(((val.bookings / val.sv) * 100).toFixed(1)) : 0,
  }));

  let cumSV = 0, cumBookings = 0, cumCancel = 0;
  const cumulativeData = periodData.map((d) => {
    cumSV += d["Site Visits"]; cumBookings += d.Bookings; cumCancel += d.Cancellations;
    return { period: d.period, "Cumulative SV": cumSV, "Cumulative Bookings": cumBookings, "Cumulative Cancellations": cumCancel };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Detailed performance analysis and trends</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            {[2026, 2027, 2028, 2029, 2030].map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          {session?.user.role === "admin" && (
            <>
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">All Projects</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">All Team Leads</option>
                {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Comparison</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} unit="%" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="Site Visits" fill="#0d9488" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="Bookings" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="Cancellations" fill="#dc2626" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="Conversion %" stroke="#d97706" strokeWidth={2} dot={{ fill: "#d97706" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Period-wise Site Visits vs Bookings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={periodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip /><Legend />
              <Bar dataKey="Site Visits" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bookings" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Net Bookings vs Cancellations</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={periodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip /><Legend />
              <Area type="monotone" dataKey="Net Bookings" stroke="#0f766e" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="Cancellations" stroke="#dc2626" fill="#fef2f2" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Cumulative Growth</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip /><Legend />
            <Line type="monotone" dataKey="Cumulative SV" stroke="#0d9488" strokeWidth={2} />
            <Line type="monotone" dataKey="Cumulative Bookings" stroke="#059669" strokeWidth={2} />
            <Line type="monotone" dataKey="Cumulative Cancellations" stroke="#dc2626" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversion Rate Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={periodData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} unit="%" />
            <Tooltip />
            <Area type="monotone" dataKey="Conversion %" stroke="#d97706" fill="#fffbeb" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
