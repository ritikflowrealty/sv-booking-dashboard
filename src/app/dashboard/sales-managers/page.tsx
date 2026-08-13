"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";

interface SalesManager {
  id: string;
  name: string;
  teamLead: { id: string; name: string };
  _count: { entries: number };
}

export default function SalesManagersPage() {
  const [managers, setManagers] = useState<SalesManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const fetchData = async () => {
    const res = await fetch("/api/sales-managers");
    setManagers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setMessage("");

    const res = await fetch("/api/sales-managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.ok) {
      setMessage("Sales Manager added");
      setMessageType("success");
      setName("");
      fetchData();
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed");
      setMessageType("error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sales manager? All their entries will also be deleted.")) return;
    const res = await fetch(`/api/sales-managers/${id}`, { method: "DELETE" });
    if (res.ok) { setMessage("Deleted"); setMessageType("success"); fetchData(); }
    else { setMessage("Failed"); setMessageType("error"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Managers</h1>
        <p className="text-gray-500">Add sales managers who report to you. They will appear in data entry and bulk upload.</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{message}</div>
      )}

      {/* Add Form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter sales manager name"
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          required
        />
        <button type="submit" className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-4 rounded-lg transition">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                <th className="text-center px-5 py-3 font-medium text-gray-600">Entries</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {managers.map((sm) => (
                <tr key={sm.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900 font-medium">{sm.name}</td>
                  <td className="text-center px-5 py-3 text-gray-600">{sm._count.entries}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDelete(sm.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {managers.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No sales managers added yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
