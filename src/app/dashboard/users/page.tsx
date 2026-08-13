"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Project {
  id: string;
  name: string;
  developer: { name: string };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  projectId: string | null;
  project?: { id: string; name: string; developer: { name: string } } | null;
  createdAt: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "team_lead", projectId: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (session?.user.role !== "admin") { router.push("/dashboard"); return; }
    fetchData();
  }, [session]);

  const fetchData = async () => {
    const [usersRes, projRes] = await Promise.all([fetch("/api/users"), fetch("/api/projects")]);
    setUsers(await usersRes.json());
    setProjects(await projRes.json());
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) { setMessage("User updated"); setMessageType("success"); }
        else { const d = await res.json(); setMessage(d.error || "Failed"); setMessageType("error"); return; }
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) { setMessage("User created"); setMessageType("success"); }
        else { const d = await res.json(); setMessage(d.error || "Failed"); setMessageType("error"); return; }
      }

      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: "", email: "", password: "", role: "team_lead", projectId: "" });
      fetchData();
    } catch {
      setMessage("An error occurred");
      setMessageType("error");
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role, projectId: user.projectId || "" });
    setShowForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    if (res.ok) { setMessage("Deleted"); setMessageType("success"); fetchData(); }
    else { setMessage("Failed to delete"); setMessageType("error"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Leads</h1>
          <p className="text-gray-500">Create and manage team lead accounts</p>
        </div>
        <button onClick={() => { setEditingUser(null); setFormData({ name: "", email: "", password: "", role: "team_lead", projectId: "" }); setShowForm(!showForm); }} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-4 rounded-lg transition">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{message}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editingUser ? "Edit User" : "Create New User"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password {editingUser && "(leave blank to keep current)"}</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" required={!editingUser} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="team_lead">Team Lead</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign to Project</label>
              <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">No project assigned</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.developer.name} / {p.name}</option>))}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-6 rounded-lg transition">{editingUser ? "Update" : "Create"}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingUser(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-6 rounded-lg transition">Cancel</button>
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
                <th className="text-left px-5 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Project</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Created</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900 font-medium">{user.name}</td>
                  <td className="px-5 py-3 text-gray-600">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-teal-50 text-teal-700"}`}>
                      {user.role === "admin" ? "Admin" : "Team Lead"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{user.project ? `${user.project.developer.name} / ${user.project.name}` : "-"}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-600 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
