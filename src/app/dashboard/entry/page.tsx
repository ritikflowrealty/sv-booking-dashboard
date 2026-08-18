"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentPeriod, getMonthName } from "@/lib/utils";

interface CancelDetail { count: number; bookedYear: number; bookedMonth: number; bookedHalf: number; }
interface ProjectOption { id: string; name: string; developer: { name: string }; }
interface SMOption { id: string; name: string; }
interface DeputyOption { id: string; name: string; }
interface ExistingEntry { id: string; siteVisits: number; bookings: number; cancellations: number; deputyTLId: string | null; cancelDetails: CancelDetail[]; }

export default function EntryPage() {
  const currentPeriod = getCurrentPeriod();
  const now = new Date();

  const [year, setYear] = useState(currentPeriod.year);
  const [month, setMonth] = useState(currentPeriod.month);
  const [half, setHalf] = useState(currentPeriod.half);
  const [siteVisits, setSiteVisits] = useState(0);
  const [bookings, setBookings] = useState(0);
  const [cancellations, setCancellations] = useState(0);
  const [cancelDetails, setCancelDetails] = useState<CancelDetail[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSM, setSelectedSM] = useState("");
  const [selectedDeputy, setSelectedDeputy] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [salesManagers, setSalesManagers] = useState<SMOption[]>([]);
  const [deputies, setDeputies] = useState<DeputyOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [existingEntry, setExistingEntry] = useState<ExistingEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetch("/api/my-projects").then((r) => r.json()).then(setProjects);
    fetch("/api/deputy-tls").then((r) => r.json()).then(setDeputies);
  }, []);

  useEffect(() => {
    const params = selectedProject ? `?projectId=${selectedProject}` : "";
    fetch(`/api/sales-managers${params}`).then((r) => r.json()).then(setSalesManagers);
    setSelectedSM("");
  }, [selectedProject]);

  // Lookup existing entry when all selectors are filled
  const lookupEntry = useCallback(async () => {
    if (!selectedSM || !selectedProject || !year || !month || !half) {
      setExistingEntry(null);
      setIsEditing(false);
      return;
    }
    const params = new URLSearchParams({
      salesManagerId: selectedSM, projectId: selectedProject,
      year: year.toString(), month: month.toString(), half: half.toString(),
    });
    const res = await fetch(`/api/entries/lookup?${params}`);
    const data = await res.json();
    if (data && data.id) {
      setExistingEntry(data);
      setSiteVisits(data.siteVisits);
      setBookings(data.bookings);
      setCancellations(data.cancellations);
      setSelectedDeputy(data.deputyTLId || "");
      setCancelDetails(data.cancelDetails || []);
      setIsEditing(true);
    } else {
      setExistingEntry(null);
      setSiteVisits(0); setBookings(0); setCancellations(0);
      setCancelDetails([]); setSelectedDeputy("");
      setIsEditing(false);
    }
  }, [selectedSM, selectedProject, year, month, half]);

  useEffect(() => { lookupEntry(); }, [lookupEntry]);

  useEffect(() => {
    if (cancellations > 0 && cancelDetails.length === 0) {
      setCancelDetails([{ count: cancellations, bookedYear: year, bookedMonth: month > 1 ? month - 1 : 12, bookedHalf: 1 }]);
    } else if (cancellations === 0) {
      setCancelDetails([]);
    }
  }, [cancellations]);

  const addCancelDetail = () => setCancelDetails([...cancelDetails, { count: 0, bookedYear: year, bookedMonth: month, bookedHalf: 1 }]);
  const removeCancelDetail = (i: number) => setCancelDetails(cancelDetails.filter((_, idx) => idx !== i));
  const updateCancelDetail = (i: number, field: keyof CancelDetail, value: number) => {
    const u = [...cancelDetails]; u[i] = { ...u[i], [field]: value }; setCancelDetails(u);
  };

  const totalCancelCount = cancelDetails.reduce((s, d) => s + d.count, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMessage("");

    if (!selectedProject || !selectedSM) {
      setMessage("Select a project and sales manager"); setMessageType("error"); setSubmitting(false); return;
    }
    if (cancellations > 0 && totalCancelCount !== cancellations) {
      setMessage(`Cancellation details must total ${cancellations} (currently ${totalCancelCount})`); setMessageType("error"); setSubmitting(false); return;
    }

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year, month, half, siteVisits, bookings, cancellations,
        cancelDetails: cancellations > 0 ? cancelDetails : [],
        salesManagerId: selectedSM, projectId: selectedProject,
        deputyTLId: selectedDeputy || null,
      }),
    });

    if (res.ok) {
      setMessage(isEditing ? "Entry updated successfully!" : "Entry saved successfully!");
      setMessageType("success");
      lookupEntry(); // Refresh
    } else {
      const d = await res.json();
      setMessage(d.error || "Failed to save"); setMessageType("error");
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!existingEntry) return;
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/entries/${existingEntry.id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Entry deleted"); setMessageType("success");
      setExistingEntry(null); setIsEditing(false);
      setSiteVisits(0); setBookings(0); setCancellations(0); setCancelDetails([]); setSelectedDeputy("");
    } else { setMessage("Failed to delete"); setMessageType("error"); }
  };

  // Year options: 2025 to current year only
  const yearOptions = Array.from({ length: now.getFullYear() - 2024 }, (_, i) => 2025 + i);
  // Month options: restrict to past/current if current year
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((m) => year < now.getFullYear() || m <= now.getMonth() + 1);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Data Entry</h1>
        <p className="text-[13px] text-[#64748b] mt-0.5">Enter or update site visits, bookings and cancellations</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Project & SM */}
        <Card title="Project and Sales Manager">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Project">
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="input" required>
                <option value="">Select Project</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </Field>
            <Field label="Sales Manager">
              <select value={selectedSM} onChange={(e) => setSelectedSM(e.target.value)} className="input" required>
                <option value="">Select Sales Manager</option>
                {salesManagers.map((sm) => (<option key={sm.id} value={sm.id}>{sm.name}</option>))}
              </select>
            </Field>
          </div>
          {deputies.length > 0 && (
            <Field label="Supported By (Deputy TL)" className="mt-4">
              <select value={selectedDeputy} onChange={(e) => setSelectedDeputy(e.target.value)} className="input">
                <option value="">None</option>
                {deputies.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </Field>
          )}
        </Card>

        {/* Period */}
        <Card title="Period">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Year">
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input">
                {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </Field>
            <Field label="Month">
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="input">
                {monthOptions.map((m) => (<option key={m} value={m}>{getMonthName(m)}</option>))}
              </select>
            </Field>
            <Field label="Period">
              <select value={half} onChange={(e) => setHalf(parseInt(e.target.value))} className="input">
                <option value={1}>1st to 15th</option>
                {(year < now.getFullYear() || month < now.getMonth() + 1 || now.getDate() > 15) && (
                  <option value={2}>16th to End</option>
                )}
              </select>
            </Field>
          </div>
          {isEditing && (
            <div className="mt-3 flex items-center justify-between bg-[#f0fdfa] border border-[#ccfbf1] rounded-[10px] px-4 py-2.5">
              <span className="text-[12px] text-[#115e59] font-medium">Existing entry found. Editing will update it.</span>
              <button type="button" onClick={handleDelete} className="text-[12px] text-[#b91c1c] font-medium hover:underline">Delete</button>
            </div>
          )}
        </Card>

        {/* Numbers */}
        <Card title="Data">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Site Visits">
              <input type="number" min={0} value={siteVisits} onChange={(e) => setSiteVisits(parseInt(e.target.value) || 0)} className="input" />
            </Field>
            <Field label="Bookings">
              <input type="number" min={0} value={bookings} onChange={(e) => setBookings(parseInt(e.target.value) || 0)} className="input" />
            </Field>
            <Field label="Cancellations">
              <input type="number" min={0} value={cancellations} onChange={(e) => setCancellations(parseInt(e.target.value) || 0)} className="input" />
            </Field>
          </div>
        </Card>

        {/* Cancel Details */}
        {cancellations > 0 && (
          <Card title="Cancellation Details">
            <p className="text-[12px] text-[#64748b] mb-3">When were these cancelled units originally booked?</p>
            {totalCancelCount !== cancellations && (
              <div className="bg-[#fffbeb] border border-[#fde68a] text-[#92400e] px-3 py-2 rounded-[8px] text-[12px] mb-3">
                Total ({totalCancelCount}) must equal {cancellations}
              </div>
            )}
            <div className="space-y-2.5">
              {cancelDetails.map((d, i) => (
                <div key={i} className="flex items-end gap-2 p-2.5 bg-[#fafbfc] rounded-[8px]">
                  <Field label="Count" className="w-16">
                    <input type="number" min={0} value={d.count} onChange={(e) => updateCancelDetail(i, "count", parseInt(e.target.value) || 0)} className="input" />
                  </Field>
                  <Field label="Year" className="flex-1">
                    <select value={d.bookedYear} onChange={(e) => updateCancelDetail(i, "bookedYear", parseInt(e.target.value))} className="input">
                      {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
                    </select>
                  </Field>
                  <Field label="Month" className="flex-1">
                    <select value={d.bookedMonth} onChange={(e) => updateCancelDetail(i, "bookedMonth", parseInt(e.target.value))} className="input">
                      {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>))}
                    </select>
                  </Field>
                  <Field label="Half" className="flex-1">
                    <select value={d.bookedHalf} onChange={(e) => updateCancelDetail(i, "bookedHalf", parseInt(e.target.value))} className="input">
                      <option value={1}>1st-15th</option>
                      <option value={2}>16th-End</option>
                    </select>
                  </Field>
                  {cancelDetails.length > 1 && (
                    <button type="button" onClick={() => removeCancelDetail(i)} className="text-[12px] text-[#b91c1c] hover:underline pb-1">Remove</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addCancelDetail} className="mt-2 text-[12px] text-[#0d9488] font-medium hover:underline">+ Add row</button>
          </Card>
        )}

        {message && (
          <div className={`px-4 py-2.5 rounded-[10px] text-[13px] ${messageType === "success" ? "bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857]" : "bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c]"}`}>
            {message}
          </div>
        )}

        <button type="submit" disabled={submitting} className="bg-[#115e59] hover:bg-[#0c4a46] text-white font-medium py-2.5 px-6 rounded-[10px] text-[13px] transition-all disabled:opacity-50 active:scale-[0.97]">
          {submitting ? "Saving..." : isEditing ? "Update Entry" : "Save Entry"}
        </button>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[14px] border border-[#e8eced] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
      <h3 className="text-[13px] font-semibold text-[#1a1a2e] mb-3" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-medium text-[#64748b] mb-1">{label}</label>
      {children}
    </div>
  );
}
