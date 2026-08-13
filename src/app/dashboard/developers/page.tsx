"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Developer {
  id: string;
  name: string;
  location: string | null;
  projects: { id: string; name: string; _count: { users: number; entries: number } }[];
}

export default function DevelopersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Developer | null>(null);
  const [formData, setFormData] = useState({ name: "", location: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (session?.user.role !== "admin") { router.push("/dashboard"); return; }
    fetchData();
  }, [session]);

  const fetchData = async () => {
    const res = await fetch("/api/developers");
    setDevelopers(await res.json());
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const url = editing ? `/api/developers/${editing.id}` : "/api/developers";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setMessage(editing ? "Developer updated" : "Developer created");
      setMessageType("success");
      setShowForm(false);
      setEditing(null);
      setFormData({ name: "", location: "" });
      fetchData();
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed");
      setMessageType("error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this developer? All associated projects will also be deleted.")) return;
    const res = await fetch(`/api/developers/${id}`, { method: "DELETE" });
    if (res.ok) { setMessage("Deleted"); setMessageType("success"); fetchData(); }
    else { setMessage("Failed to delete"); setMessageType("error"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developers</h1>
          <p className="text-gray-500">Manage real estate developers</p>
        </div>
        <button onClick={() => { setEditing(null); setFormData({ name: "", location: "" }); setShowForm(!showForm); }} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-4 rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Developer
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{message}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editing ? "Edit Developer" : "Add New Developer"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Developer Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. Bangalore" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-6 rounded-lg transition">{editing ? "Update" : "Create"}</button>
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
                <th className="text-left px-5 py-3 font-medium text-gray-600">Developer Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Location</th>
                <th className="text-center px-5 py-3 font-medium text-gray-600">Projects</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {developers.map((dev) => (
                <tr key={dev.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900 font-medium">{dev.name}</td>
                  <td className="px-5 py-3 text-gray-600">{dev.location || "-"}</td>
                  <td className="text-center px-5 py-3 text-gray-600">{dev.projects.length}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditing(dev); setFormData({ name: dev.name, location: dev.location || "" }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-600 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(dev.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {developers.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No developers added yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
