"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getCurrentPeriod, getMonthName } from "@/lib/utils";

interface CancelDetail {
  count: number;
  bookedYear: number;
  bookedMonth: number;
  bookedHalf: number;
}

interface ProjectOption {
  id: string;
  name: string;
  developer: { name: string };
}

export default function EntryPage() {
  const { data: session } = useSession();
  const currentPeriod = getCurrentPeriod();

  const [year, setYear] = useState(currentPeriod.year);
  const [month, setMonth] = useState(currentPeriod.month);
  const [half, setHalf] = useState(currentPeriod.half);
  const [siteVisits, setSiteVisits] = useState(0);
  const [bookings, setBookings] = useState(0);
  const [cancellations, setCancellations] = useState(0);
  const [cancelDetails, setCancelDetails] = useState<CancelDetail[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (session?.user.role === "admin") {
      fetch("/api/users").then((res) => res.json()).then((data) => setUsers(data));
      fetch("/api/projects").then((res) => res.json()).then((data) => setProjects(data));
    } else {
      fetch("/api/projects").then((res) => res.json()).then((data) => setProjects(data));
    }
  }, [session]);

  useEffect(() => {
    if (cancellations > 0) {
      if (cancelDetails.length === 0) {
        setCancelDetails([{ count: cancellations, bookedYear: year, bookedMonth: month, bookedHalf: half }]);
      }
    } else {
      setCancelDetails([]);
    }
  }, [cancellations]);

  const addCancelDetail = () => {
    setCancelDetails([...cancelDetails, { count: 0, bookedYear: year, bookedMonth: month, bookedHalf: 1 }]);
  };

  const removeCancelDetail = (index: number) => {
    setCancelDetails(cancelDetails.filter((_, i) => i !== index));
  };

  const updateCancelDetail = (index: number, field: keyof CancelDetail, value: number) => {
    const updated = [...cancelDetails];
    updated[index] = { ...updated[index], [field]: value };
    setCancelDetails(updated);
  };

  const totalCancelCount = cancelDetails.reduce((sum, d) => sum + d.count, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    if (cancellations > 0 && totalCancelCount !== cancellations) {
      setMessage(`Cancellation details must add up to ${cancellations}. Current total: ${totalCancelCount}`);
      setMessageType("error");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          half,
          siteVisits,
          bookings,
          cancellations,
          cancelDetails: cancellations > 0 ? cancelDetails : [],
          userId: selectedUser || undefined,
          projectId: selectedProject || undefined,
        }),
      });

      if (res.ok) {
        setMessage("Entry saved successfully!");
        setMessageType("success");
        setSiteVisits(0);
        setBookings(0);
        setCancellations(0);
        setCancelDetails([]);
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to save entry");
        setMessageType("error");
      }
    } catch {
      setMessage("Failed to save entry");
      setMessageType("error");
    }

    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Entry</h1>
        <p className="text-gray-500">Enter site visits, bookings and cancellations for a 15-day period</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Period Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Select Period</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Period</label>
              <select value={half} onChange={(e) => setHalf(parseInt(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value={1}>1st to 15th</option>
                <option value={2}>16th to End</option>
              </select>
            </div>
          </div>

          {/* Project Selection */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select Project</option>
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.developer.name} / {p.name}</option>))}
            </select>
          </div>

          {session?.user.role === "admin" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Team Lead</label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select (or yourself)</option>
                {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
            </div>
          )}
        </div>

        {/* Numbers Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Enter Data</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Site Visits</label>
              <input type="number" min={0} value={siteVisits} onChange={(e) => setSiteVisits(parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bookings</label>
              <input type="number" min={0} value={bookings} onChange={(e) => setBookings(parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cancellations</label>
              <input type="number" min={0} value={cancellations} onChange={(e) => setCancellations(parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
        </div>

        {/* Cancellation Details */}
        {cancellations > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Cancellation Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Specify when these cancelled units were originally booked</p>
              </div>
              <button type="button" onClick={addCancelDetail} className="text-sm text-teal-600 hover:text-teal-700 font-medium">+ Add Row</button>
            </div>

            {totalCancelCount !== cancellations && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-lg text-sm mb-4">
                Total cancellation count ({totalCancelCount}) must equal {cancellations}
              </div>
            )}

            <div className="space-y-3">
              {cancelDetails.map((detail, index) => (
                <div key={index} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Count</label>
                    <input type="number" min={0} value={detail.count} onChange={(e) => updateCancelDetail(index, "count", parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Booked Year</label>
                    <select value={detail.bookedYear} onChange={(e) => updateCancelDetail(index, "bookedYear", parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Booked Month</label>
                    <select value={detail.bookedMonth} onChange={(e) => updateCancelDetail(index, "bookedMonth", parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Booked Period</label>
                    <select value={detail.bookedHalf} onChange={(e) => updateCancelDetail(index, "bookedHalf", parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value={1}>1st to 15th</option>
                      <option value={2}>16th to End</option>
                    </select>
                  </div>
                  {cancelDetails.length > 1 && (
                    <button type="button" onClick={() => removeCancelDetail(index)} className="px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {message}
          </div>
        )}

        <button type="submit" disabled={submitting} className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? "Saving..." : "Save Entry"}
        </button>
      </form>
    </div>
  );
}
