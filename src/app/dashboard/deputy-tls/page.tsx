"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";

interface Deputy { id: string; name: string; }

export default function DeputyTLsPage() {
  const [deputies, setDeputies] = useState<Deputy[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const fetchData = async () => { const r = await fetch("/api/deputy-tls"); setDeputies(await r.json()); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/deputy-tls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    if (res.ok) { setMessage("Added"); setMessageType("success"); setName(""); fetchData(); }
    else { const d = await res.json(); setMessage(d.error || "Failed"); setMessageType("error"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Deputy TL?")) return;
    const res = await fetch(`/api/deputy-tls/${id}`, { method: "DELETE" });
    if (res.ok) { setMessage("Deleted"); setMessageType("success"); fetchData(); }
    else { setMessage("Failed"); setMessageType("error"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-[22px] font-semibold text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Deputy TLs</h1>
        <p className="text-[13px] text-[#64748b] mt-0.5">Deputy Team Leads who support Sales Managers. Their performance is tracked via the "Supported By" field in data entry.</p>
      </div>

      {message && <div className={`px-4 py-2.5 rounded-[10px] text-[13px] ${messageType === "success" ? "bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857]" : "bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c]"}`}>{message}</div>}

      <form onSubmit={handleAdd} className="bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 flex gap-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Deputy TL name" className="input flex-1" required />
        <button type="submit" className="flex items-center gap-1.5 bg-[#115e59] hover:bg-[#0c4a46] text-white font-medium py-2 px-4 rounded-[8px] text-[13px] transition-all active:scale-[0.97]">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      <div className="bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#fafbfc]">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium text-[#64748b]">Name</th>
              <th className="text-right px-5 py-2.5 font-medium text-[#64748b]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f3f4]">
            {deputies.map((d) => (
              <tr key={d.id} className="hover:bg-[#f8fafb]">
                <td className="px-5 py-2.5 text-[#1a1a2e] font-medium">{d.name}</td>
                <td className="px-5 py-2.5 text-right">
                  <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-[6px] hover:bg-[#fef2f2] text-[#94a3b8] hover:text-[#b91c1c] transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {deputies.length === 0 && <tr><td colSpan={2} className="px-5 py-8 text-center text-[#94a3b8]">No Deputy TLs added yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
