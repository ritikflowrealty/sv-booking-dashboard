"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Developer {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  location: string | null;
  developer: Developer;
  _count: { users: number; entries: number };
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: "", developerId: "", location: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (session?.user.role !== "admin") { router.push("/dashboard"); return; }
    fetchData();
  }, [session]);

  const fetchData = async () => {
    const [projRes, devRes] = await Promise.all([fetch("/api/projects"), fetch("/api/developers")]);
    setProjects(await projRes.json());
    setDevelopers(await devRes.json());
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const url = editing ? `/api/projects/${editing.id}` : "/api/projects";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setMessage(editing ? "Project updated" : "Project created");
      setMessageType("success");
      setShowForm(false);
      setEditing(null);
      setFormData({ name: "", developerId: "", location: "" });
      fetchData();
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed");
      setMessageType("error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) { setMessage("Deleted"); setMessageType("success"); fetchData(); }
    else { setMessage("Failed to delete"); setMessageType("error"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Manage projects under developers</p>
        </div>
        <button onClick={() => { setEditing(null); setFormData({ name: "", developerId: "", location: "" }); setShowForm(!showForm); }} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-4 rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{message}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editing ? "Edit Project" : "Add New Project"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Developer</label>
              <select value={formData.developerId} onChange={(e) => setFormData({ ...formData, developerId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" required>
                <option value="">Select Developer</option>
                {developers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. Bangalore" />
            </div>
            <div className="sm:col-span-3 flex gap-3">
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
                <th className="text-left px-5 py-3 font-medium text-gray-600">Developer</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Project</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Location</th>
                <th className="text-center px-5 py-3 font-medium text-gray-600">Team Leads</th>
                <th className="text-center px-5 py-3 font-medium text-gray-600">Entries</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((proj) => (
                <tr key={proj.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900 font-medium">{proj.developer.name}</td>
                  <td className="px-5 py-3 text-gray-700">{proj.name}</td>
                  <td className="px-5 py-3 text-gray-600">{proj.location || "-"}</td>
                  <td className="text-center px-5 py-3 text-gray-600">{proj._count.users}</td>
                  <td className="text-center px-5 py-3 text-gray-600">{proj._count.entries}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditing(proj); setFormData({ name: proj.name, developerId: proj.developer.id, location: proj.location || "" }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-600 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(proj.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No projects added yet. Add a developer first, then create projects.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
