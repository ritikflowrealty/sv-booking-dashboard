"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";

interface ProjectOption { id: string; name: string; developer: { name: string }; }
interface SMProject { project: ProjectOption; }
interface SalesManager {
  id: string;
  name: string;
  salesManagerProjects: SMProject[];
  _count: { entries: number };
}

export default function SalesManagersPage() {
  const [managers, setManagers] = useState<SalesManager[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SalesManager | null>(null);
  const [name, setName] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const fetchData = async () => {
    const [smRes, pRes] = await Promise.all([fetch("/api/sales-managers"), fetch("/api/my-projects")]);
    setManagers(await smRes.json());
    setProjects(await pRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setMessage("");

    if (editing) {
      const res = await fetch(`/api/sales-managers/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), projectIds: selectedProjectIds }),
      });
      if (res.ok) { setMessage("Updated"); setMessageType("success"); }
      else { const d = await res.json(); setMessage(d.error || "Failed"); setMessageType("error"); return; }
    } else {
      const res = await fetch("/api/sales-managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), projectIds: selectedProjectIds }),
      });
      if (res.ok) { setMessage("Sales Manager added"); setMessageType("success"); }
      else { const d = await res.json(); setMessage(d.error || "Failed"); setMessageType("error"); return; }
    }

    setName("");
    setSelectedProjectIds([]);
    setShowForm(false);
    setEditing(null);
    fetchData();
  };

  const handleEdit = (sm: SalesManager) => {
    setEditing(sm);
    setName(sm.name);
    setSelectedProjectIds(sm.salesManagerProjects.map((sp) => sp.project.id));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sales manager? All their entries will also be deleted.")) return;
    const res = await fetch(`/api/sales-managers/${id}`, { method: "DELETE" });
    if (res.ok) { setMessage("Deleted"); setMessageType("success"); fetchData(); }
    else { setMessage("Failed"); setMessageType("error"); }
  };

  const toggleProject = (pid: string) => {
    setSelectedProjectIds((prev) => prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Managers</h1>
          <p className="text-gray-500">Manage sales managers and their project assignments</p>
        </div>
        <button onClick={() => { setEditing(null); setName(""); setSelectedProjectIds([]); setShowForm(!showForm); }} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-4 rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Sales Manager
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{message}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editing ? "Edit Sales Manager" : "Add New Sales Manager"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter sales manager name" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Projects</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                    <input type="checkbox" checked={selectedProjectIds.includes(p.id)} onChange={() => toggleProject(p.id)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                    <span className="text-gray-700">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-6 rounded-lg transition">{editing ? "Update" : "Add"}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-6 rounded-lg transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Projects</th>
                <th className="text-center px-5 py-3 font-medium text-gray-600">Entries</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {managers.map((sm) => (
                <tr key={sm.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900 font-medium">{sm.name}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {sm.salesManagerProjects.length > 0
                      ? sm.salesManagerProjects.map((sp) => sp.project.name).join(", ")
                      : <span className="text-gray-400">No projects assigned</span>}
                  </td>
                  <td className="text-center px-5 py-3 text-gray-600">{sm._count.entries}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(sm)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-600 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(sm.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {managers.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No sales managers added yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
