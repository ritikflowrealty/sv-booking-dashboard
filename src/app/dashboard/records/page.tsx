"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { getPeriodLabel } from "@/lib/utils";

interface EntryRecord {
  id: string;
  year: number;
  month: number;
  half: number;
  siteVisits: number;
  bookings: number;
  cancellations: number;
  salesManager: { id: string; name: string };
  project: { id: string; name: string; developer: { name: string } };
}

export default function RecordsPage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const fetchEntries = async () => {
    setLoading(true);
    const res = await fetch(`/api/entries?year=${year}`);
    setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [year]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (res.ok) { setMessage("Entry deleted"); setMessageType("success"); fetchEntries(); }
    else { const d = await res.json(); setMessage(d.error || "Failed"); setMessageType("error"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Records</h1>
          <p className="text-gray-500">View and delete entries</p>
        </div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
        </select>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{message}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Period</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Sales Manager</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Project</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">SV</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Bookings</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Cancellations</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{getPeriodLabel(entry.year, entry.month, entry.half)}</td>
                  <td className="px-5 py-3 text-gray-600">{entry.salesManager.name}</td>
                  <td className="px-5 py-3 text-gray-600">{entry.project.developer.name} / {entry.project.name}</td>
                  <td className="text-right px-5 py-3 text-gray-900 font-medium">{entry.siteVisits}</td>
                  <td className="text-right px-5 py-3 text-emerald-600 font-medium">{entry.bookings}</td>
                  <td className="text-right px-5 py-3 text-red-600 font-medium">{entry.cancellations}</td>
                  <td className="text-right px-5 py-3">
                    <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
